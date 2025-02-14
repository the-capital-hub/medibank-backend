import { S3Client, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import prisma from "../models/prismaClient";
import { verifyToken } from "../utils/jwt";
import { v4 as uuidv4 } from "uuid";
import { Buffer } from "buffer";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

const validateAwsConfig = () => {
  const required = [
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_S3_BUCKET'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required AWS configuration: ${missing.join(', ')}`);
  }

  return {
    region: process.env.AWS_REGION!,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    bucketName: process.env.AWS_S3_BUCKET!
  };
};

const awsConfig = validateAwsConfig();
const s3Client = new S3Client({
  region: awsConfig.region,
  credentials: {
    accessKeyId: awsConfig.accessKeyId,
    secretAccessKey: awsConfig.secretAccessKey,
  },
});

const getExtensionFromMimetype = (mime: string): string => {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'application/pdf': 'pdf'
  };
  return extensions[mime] || 'jpg';
};

const getMimeTypeLabel = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) {
    return 'Image';
  } else if (mimeType === 'application/pdf') {
    return 'PDF';
  }
  return 'Unknown';
};

const parseBase64File = (base64Data: string) => {
  try {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    
    if (matches?.length === 3) {
      return {
        mimeType: matches[1],
        buffer: Buffer.from(matches[2], 'base64')
      };
    }
    
    return {
      mimeType: null,
      buffer: Buffer.from(base64Data, 'base64')
    };
  } catch (error) {
    throw new Error('Invalid base64 data');
  }
};

const detectMimeType = (buffer: Buffer): string => {
  const signatures: Record<string, string> = {
    'ffd8ff': 'image/jpeg',
    '89504e47': 'image/png',
    '25504446': 'application/pdf'
  };

  const hex = buffer.toString('hex', 0, 4);
  
  for (const [signature, mimeType] of Object.entries(signatures)) {
    if (hex.startsWith(signature)) {
      return mimeType;
    }
  }
  
  throw new Error('Unsupported file format');
};

const extractS3KeyFromUrl = (url: string): string | null => {
  try {
    if (!url) return null;
    
    const urlWithoutParams = url.split('?')[0];
    const matches = urlWithoutParams.match(/amazonaws\.com\/(.+)$/);
    return matches ? matches[1] : null;
  } catch (error) {
    console.error("Error extracting S3 key:", error);
    return null;
  }
};

const generatePresignedUrl = async (key: string): Promise<string> => {
  const params = {
    Bucket: awsConfig.bucketName,
    Key: key,
  };
  return await getSignedUrl(s3Client, new GetObjectCommand(params), { expiresIn: 7 * 24 * 60 * 60 });
};

// Main service
export const appointmentUploadService = {
    async uploadPrescription(base64Data: string, appointmentId: string, token: string) {
        try {
          // Validate token
          if (!token) {
            throw new Error("Token is required");
          }
    
          const decoded = verifyToken(token);
          if (!decoded?.userId) {
            throw new Error("Invalid token");
          }
    
          // Find appointment
          const appointment = await prisma.userAppointment.findUnique({
            where: { appointmentId }
          });
    
          if (!appointment) {
            throw new Error("Appointment not found");
          }
    
          // Process file
          const { buffer, mimeType: detectedMimeType } = parseBase64File(base64Data);
          
          if (buffer.length > MAX_FILE_SIZE) {
            throw new Error('File size exceeds maximum limit of 10MB');
          }
    
          const mimetype = detectedMimeType || detectMimeType(buffer);
          
          if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
            throw new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed');
          }
    
          // Generate filename
          const fileExtension = getExtensionFromMimetype(mimetype);
          const s3FileName = `AppointmentDocUploads/${appointmentId}/prescriptions/${uuidv4()}.${fileExtension}`;
    
          // Upload file
          const upload = new Upload({
            client: s3Client,
            params: {
              Bucket: awsConfig.bucketName,
              Key: s3FileName,
              Body: buffer,
              ContentType: mimetype,
              CacheControl: 'public, max-age=86400',
              ContentDisposition: 'inline',
            },
          });
    
          await upload.done();
    
          // Generate URLs
          const presignedUrl = await generatePresignedUrl(s3FileName)
          .catch((error) => {
            throw new Error("Failed to generate presigned URL: " + error.message);
          });
          const s3FileUrl = `https://${awsConfig.bucketName}.s3.${awsConfig.region}.amazonaws.com/${s3FileName}`;
    
          // Update appointment with prescription URL
          const updatedAppointment = await prisma.userAppointment.update({
            where: { appointmentId },
            data: {
              uploadPrescription: presignedUrl,
              prescriptionDocType: getMimeTypeLabel(mimetype),
              updatedOn: new Date()
            },
          });
    
          return {
            success: true,
            appointment: updatedAppointment,
            prescriptionDocType: getMimeTypeLabel(mimetype),
            uploadPrescription: presignedUrl,
            s3url: s3FileUrl,
            message: 'Prescription uploaded successfully',
          };
    
        } catch (error) {
          console.error("Error uploading prescription:", error);
          return {
            success: false,
            message: error instanceof Error ? error.message : "Failed to upload prescription",
            appointment: null,
        uploadPrescription: null,
            s3url: null
          };
        }
      },
    
      async refreshPrescriptionUrl(appointmentId: string, token: string) {
        try {
          if (!token) {
            throw new Error("Token is required");
          }
    
          const decoded = verifyToken(token);
          if (!decoded?.userId) {
            throw new Error("Invalid token");
          }
    
          const appointment = await prisma.userAppointment.findUnique({
            where: { appointmentId }
          });
    
          if (!appointment?.uploadPrescription) {
            throw new Error("No prescription found for this appointment");
          }
    
          const urlParts = appointment.uploadPrescription.split('/');
          const s3Key = urlParts.slice(3).join('/');
          
          const newPresignedUrl = await generatePresignedUrl(s3Key);
    
          const updatedAppointment = await prisma.userAppointment.update({
            where: { appointmentId },
            data: {
              uploadPrescription: newPresignedUrl,
              updatedOn: new Date()
            },
          });
    
          return {
            success: true,
            appointment: updatedAppointment,
            uploadPrescription: newPresignedUrl,
            message: "Prescription URL refreshed successfully"
          };
        } catch (error) {
          return {
            success: false,
            message: error instanceof Error ? error.message : "Failed to refresh prescription URL",
            appointment: null,
            uploadPrescription: null
          };
        }
      },
      async uploadReport(base64Data: string, appointmentId: string, token: string) {
        try {
          // Validate token
          if (!token) {
            throw new Error("Token is required");
          }
    
          const decoded = verifyToken(token);
          if (!decoded?.userId) {
            throw new Error("Invalid token");
          }
    
          // Find appointment
          const appointment = await prisma.userAppointment.findUnique({
            where: { appointmentId }
          });
    
          if (!appointment) {
            throw new Error("Appointment not found");
          }
    
          // Process file
          const { buffer, mimeType: detectedMimeType } = parseBase64File(base64Data);
          
          if (buffer.length > MAX_FILE_SIZE) {
            throw new Error('File size exceeds maximum limit of 10MB');
          }
    
          const mimetype = detectedMimeType || detectMimeType(buffer);
          
          if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
            throw new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed');
          }
    
          // Generate filename
          const fileExtension = getExtensionFromMimetype(mimetype);
          const s3FileName = `AppointmentDocUploads/${appointmentId}/reports/${uuidv4()}.${fileExtension}`;
    
          // Upload file
          const upload = new Upload({
            client: s3Client,
            params: {
              Bucket: awsConfig.bucketName,
              Key: s3FileName,
              Body: buffer,
              ContentType: mimetype,
              CacheControl: 'public, max-age=86400',
              ContentDisposition: 'inline',
            },
          });
    
          await upload.done();
    
          // Generate URLs
          const presignedUrl = await generatePresignedUrl(s3FileName);
          const s3FileUrl = `https://${awsConfig.bucketName}.s3.${awsConfig.region}.amazonaws.com/${s3FileName}`;
    
          // Update appointment with report URL
          const updatedAppointment = await prisma.userAppointment.update({
            where: { appointmentId },
            data: {
              uploadReport: presignedUrl,
              reportDocType: getMimeTypeLabel(mimetype),
              updatedOn: new Date()
            },
          });
    
          return {
            success: true,
            appointment: updatedAppointment,
            uploadReport: presignedUrl,
            s3url: s3FileUrl,
            message: 'Report uploaded successfully',
          };
    
        } catch (error) {
          console.error("Error uploading report:", error);
          return {
            success: false,
            message: error instanceof Error ? error.message : "Failed to upload report",
            appointment: null,
            uploadReport: null,
            s3url: null
          };
        }
      },
    
      async refreshReportUrl(appointmentId: string, token: string) {
        try {
          if (!token) {
            throw new Error("Token is required");
          }
    
          const decoded = verifyToken(token);
          if (!decoded?.userId) {
            throw new Error("Invalid token");
          }
    
          const appointment = await prisma.userAppointment.findUnique({
            where: { appointmentId }
          });
    
          if (!appointment?.uploadReport) {
            throw new Error("No report found for this appointment");
          }
    
          const s3Key = extractS3KeyFromUrl(appointment.uploadReport);
          if (!s3Key) {
            throw new Error("Invalid report URL format");
          }
          
          const newPresignedUrl = await generatePresignedUrl(s3Key);
    
          const updatedAppointment = await prisma.userAppointment.update({
            where: { appointmentId },
            data: {
              uploadReport: newPresignedUrl,
              updatedOn: new Date()
            },
          });
    
          return {
            success: true,
            appointment: updatedAppointment,
            uploadReport: newPresignedUrl,
            message: "Report URL refreshed successfully"
          };
        } catch (error) {
          return {
            success: false,
            message: error instanceof Error ? error.message : "Failed to refresh report URL",
            appointment: null,
            reportUrl: null
          };
        }
      },
    
      async deleteReport(appointmentId: string, token: string) {
        try {
          if (!token) {
            throw new Error("Token is required");
          }
    
          const decoded = verifyToken(token);
          if (!decoded?.userId) {
            throw new Error("Invalid token");
          }
    
          const appointment = await prisma.userAppointment.findUnique({
            where: { appointmentId }
          });
    
          if (!appointment?.uploadReport) {
            throw new Error("No report found for this appointment");
          }
    
          const s3Key = extractS3KeyFromUrl(appointment.uploadReport);
          if (s3Key) {
            await s3Client.send(new DeleteObjectCommand({
              Bucket: awsConfig.bucketName,
              Key: s3Key
            }));
          }
    
          const updatedAppointment = await prisma.userAppointment.update({
            where: { appointmentId },
            data: {
              uploadReport: null,
              updatedOn: new Date()
            },
          });
    
          return {
            success: true,
            appointment: updatedAppointment,
            message: "Report deleted successfully"
          };
        } catch (error) {
          return {
            success: false,
            message: error instanceof Error ? error.message : "Failed to delete report",
            appointment: null
          };
        }}
  
};