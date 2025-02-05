import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import prisma from "../models/prismaClient";
import { verifyToken } from "../utils/jwt";
import { v4 as uuidv4 } from "uuid";
import { Buffer } from "buffer";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

const getExtensionFromMimetype = (mime: string) => {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif'
  };
  return extensions[mime] || 'jpg';
};

const parseBase64Image = (base64Data: string) => {
  // Check if it's a data URL
  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  
  if (matches && matches.length === 3) {
    return {
      mimeType: matches[1],
      buffer: Buffer.from(matches[2], 'base64')
    };
  }
  
  // If it's just base64 without data URL prefix
  try {
    return {
      mimeType: null,
      buffer: Buffer.from(base64Data, 'base64')
    };
  } catch (error) {
    throw new Error('Invalid base64 data');
  }
};

const detectMimeType = (buffer: Buffer): string => {
  const signatures = {
    'ffd8ff': 'image/jpeg',
    '89504e47': 'image/png',
    '47494638': 'image/gif'
  };

  const hex = buffer.toString('hex', 0, 4);
  
  for (const [signature, mimeType] of Object.entries(signatures)) {
    if (hex.startsWith(signature)) {
      return mimeType;
    }
  }
  
  return 'image/jpeg'; // default fallback
};

const generatePresignedUrl = async (key: string): Promise<string> => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
  };
  // Set expiry to 7 days
  return await getSignedUrl(s3Client, new GetObjectCommand(params), { expiresIn: 7 * 24 * 60 * 60 });
};

export const profileUploadService = {
  async uploadProfilePicture(base64Data: string, token: string) {
    try {
      if (!base64Data) throw new Error("Base64 data is missing");
      if (!token) throw new Error("Token is required");
      if (!BUCKET_NAME) throw new Error("AWS S3 bucket name is not configured");

      // Verify token and get user
      const decoded = verifyToken(token);
      if (!decoded?.userId) throw new Error("Invalid token");

      const user = await prisma.userMaster.findUnique({ where: { ID: BigInt(decoded.userId) } });
      if (!user) throw new Error("User not found");

      // Process base64 data
      const { buffer, mimeType: detectedMimeType } = parseBase64Image(base64Data);
      
      // Validate file size
      if (buffer.length > MAX_FILE_SIZE) {
        throw new Error('File size exceeds maximum limit of 5MB');
      }

      // Determine MIME type
      const mimetype = detectedMimeType || detectMimeType(buffer);
      
      if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
        throw new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed');
      }

      const fileExtension = getExtensionFromMimetype(mimetype);
      const s3FileName = `profile-pictures/${decoded.userId}/${uuidv4()}.${fileExtension}`;

      // Upload to S3
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: BUCKET_NAME,
          Key: s3FileName,
          Body: buffer,
          ContentType: mimetype,
          CacheControl: 'public, max-age=86400', // 1 day cache
          ContentDisposition: 'inline',
        },
      });

      await upload.done();

      // Generate URLs with proper encoding
      const presignedUrl = await generatePresignedUrl(s3FileName);
      const s3ImageUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3FileName}`;

      // Store the S3 key in the database instead of the full URL
      await prisma.userMaster.update({
        where: { ID: BigInt(decoded.userId) },
        data: {
          profile_Picture: presignedUrl // Store just the S3 key
         
        },
      });

      // Return success response
      return {
        success: true,
        token,
        user,
        imageUrl: presignedUrl, // Return presigned URL for immediate use
        s3url: s3ImageUrl, // Return S3 key for future reference
        message: "Profile picture uploaded successfully",
      };

    } catch (error) {
      console.error("Error in uploadProfilePicture:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to upload profile picture",
        token,
        user: null,
        imageUrl: null,
        s3Key: null,
      };
    }
  }
};