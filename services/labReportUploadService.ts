import { S3Client, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import prisma from "../models/prismaClient";
import { verifyToken } from "../utils/jwt";
import { v4 as uuidv4 } from "uuid";
import { Buffer } from "buffer";

const default_Lab_pic = "https://shorturl.at/2dNOy"

// Configuration constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
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

// AWS Configuration validation
function validateAwsConfig() {
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
}

// Initialize S3 client
const awsConfig = validateAwsConfig();
const s3Client = new S3Client({
  region: awsConfig.region,
  credentials: {
    accessKeyId: awsConfig.accessKeyId,
    secretAccessKey: awsConfig.secretAccessKey,
  },
});

// Utility functions
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

const generatePresignedUrl = async (key: string): Promise<string> => {
  const params = {
    Bucket: awsConfig.bucketName,
    Key: key,
  };
  return await getSignedUrl(s3Client, new GetObjectCommand(params), { expiresIn: 7 * 24 * 60 * 60 });
};

// Main service
export const labReportUploadService = {
  async uploadLabReports(base64Data: string, labReportId: string, token: string) {
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
      const appointment = await prisma.userLabReport.findUnique({
        where: { labReportId }
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
      const s3FileName = `LabReportsUpload/${labReportId}/${uuidv4()}.${fileExtension}`;

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

      // Update appointment with lab report URL
      const updatedLabReport = await prisma.userLabReport.update({
        where: { labReportId },
        data: {
          labImage: default_Lab_pic,
          docType: getMimeTypeLabel(mimetype),
          uploadLabReport: presignedUrl,
          updatedOn: new Date()
        },
      });

      return {
        success: true,
        labReport: updatedLabReport,
        uploadLabReport: presignedUrl,
        labImage: default_Lab_pic,
        s3url: s3FileUrl,
        message: 'Lab report uploaded successfully',
      };

    } catch (error) {
      console.error("Error uploading lab report:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to upload lab report",
        appointment: null,
        uploadLabReport: null,
        s3url: null
      };
    }
  },

  async refreshLabReportUrl(labReportId: string, token: string) {
    try {
      if (!token) {
        throw new Error("Token is required");
      }

      const decoded = verifyToken(token);
      if (!decoded?.userId) {
        throw new Error("Invalid token");
      }

      const labReport = await prisma.userLabReport.findUnique({
        where: { labReportId }
      });

      if (!labReport?.uploadLabReport) {
        throw new Error("No lab report found for this appointment");
      }

      const s3Key = extractS3KeyFromUrl(labReport.uploadLabReport);
      if (!s3Key) {
        throw new Error("Invalid lab report URL format");
      }
      
      const newPresignedUrl = await generatePresignedUrl(s3Key);

      const updatedLabReport = await prisma.userLabReport.update({
        where: { labReportId },
        data: {
          uploadLabReport: newPresignedUrl,
          updatedOn: new Date()
        },
      });

      return {
        success: true,
        labReport: updatedLabReport,
        uploadLabReport: newPresignedUrl,
        message: "Lab report URL refreshed successfully"
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to refresh lab report URL",
        labReport: null,
        labReportUrl: null
      };
    }
  },

  async deleteLabReport(labReportId: string, token: string) {
    try {
      if (!token) {
        throw new Error("Token is required");
      }

      const decoded = verifyToken(token);
      if (!decoded?.userId) {
        throw new Error("Invalid token");
      }

      const uploadLabReport = await prisma.userLabReport.findUnique({
        where: { labReportId }
      });

      if (!uploadLabReport?.uploadLabReport) {
        throw new Error("No lab report found for this appointment");
      }

      const s3Key = extractS3KeyFromUrl(uploadLabReport.uploadLabReport);
      if (s3Key) {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: awsConfig.bucketName,
          Key: s3Key
        }));
      }

      const updatedLabReport = await prisma.userLabReport.update({
        where: { labReportId },
        data: {
          uploadLabReport: null,
          updatedOn: new Date()
        },
      });

      return {
        success: true,
        labReport: updatedLabReport,
        message: "Lab report deleted successfully"
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to delete lab report",
        labReport: null
      };
    }
  }
};
