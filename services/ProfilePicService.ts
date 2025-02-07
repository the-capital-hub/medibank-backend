import { S3Client, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import prisma from "../models/prismaClient";
import { verifyToken } from "../utils/jwt";
import { v4 as uuidv4 } from "uuid";
import { Buffer } from "buffer";

// Configuration constants
const DEFAULT_PROFILE_PICTURE = 'https://cdn-icons-png.flaticon.com/512/10709/10709674.png';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

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
    'image/gif': 'gif'
  };
  return extensions[mime] || 'jpg';
};

const parseBase64Image = (base64Data: string) => {
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
    '47494638': 'image/gif'
  };

  const hex = buffer.toString('hex', 0, 4);
  
  for (const [signature, mimeType] of Object.entries(signatures)) {
    if (hex.startsWith(signature)) {
      return mimeType;
    }
  }
  
  throw new Error('Unsupported image format');
};

const extractS3KeyFromUrl = (url: string): string | null => {
  try {
    if (!url || url === DEFAULT_PROFILE_PICTURE) return null;
    
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

// Delete file from S3
const deleteS3Object = async (key: string): Promise<boolean> => {
  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: awsConfig.bucketName,
      Key: key
    }));
    return true;
  } catch (error) {
    console.error("Error deleting S3 object:", error);
    return false;
  }
};

// Check if URL is an S3 URL
const isS3Url = (url: string): boolean => {
  return url.includes('amazonaws.com');
};

// Main service
export const profileUploadService = {
  async uploadProfileAfterVerification(base64Data: string | null, token: string) {
    try {
      // Validate token
      if (!token) {
        throw new Error("Token is required");
      }

      const decoded = verifyToken(token);
      if (!decoded?.userId) {
        throw new Error("Invalid token");
      }

      // Find user
      const user = await prisma.userMaster.findUnique({ 
        where: { ID: BigInt(decoded.userId) }
      });
      
      if (!user) {
        throw new Error("User not found");
      }

      // Handle case when no new image is provided (base64Data is null)
      if (!base64Data) {
        // Always update with default profile picture when base64Data is null
        const updatedUser = await prisma.userMaster.update({
          where: { ID: BigInt(decoded.userId) },
          data: {
            profile_Picture: DEFAULT_PROFILE_PICTURE,
            UpdatedOn: new Date()
          },
        });

        return {
          success: true,
          token,
          user: updatedUser,
          imageUrl: DEFAULT_PROFILE_PICTURE,
          s3url: DEFAULT_PROFILE_PICTURE,
          message: 'Default profile picture set',
          isUpdate: false
        };
      }

      // Process new image
      const { buffer, mimeType: detectedMimeType } = parseBase64Image(base64Data);
      
      if (buffer.length > MAX_FILE_SIZE) {
        throw new Error('File size exceeds maximum limit of 5MB');
      }

      const mimetype = detectedMimeType || detectMimeType(buffer);
      
      if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
        throw new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed');
      }

      // Generate new filename
      const fileExtension = getExtensionFromMimetype(mimetype);
      const s3FileName = `profile-pictures/${decoded.userId}/${uuidv4()}.${fileExtension}`;

      // Delete old profile picture if it's an S3 URL
      if (user.profile_Picture && isS3Url(user.profile_Picture)) {
        const oldS3Key = extractS3KeyFromUrl(user.profile_Picture);
        if (oldS3Key) {
          await deleteS3Object(oldS3Key);
        }
      }

      // Upload new image
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
      const s3ImageUrl = `https://${awsConfig.bucketName}.s3.${awsConfig.region}.amazonaws.com/${s3FileName}`;

      // Update database
      const updatedUser = await prisma.userMaster.update({
        where: { ID: BigInt(decoded.userId) },
        data: {
          profile_Picture: presignedUrl,
        },
      });

      return {
        success: true,
        token,
        user: updatedUser,
        imageUrl: presignedUrl,
        s3url: s3ImageUrl,
        message: 'Profile picture uploaded successfully',
        isUpdate: true
      };

    } catch (error) {
      console.error("Error in profile picture handling:", {
        error,
        hasRegion: !!process.env.AWS_REGION,
        hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
        hasBucket: !!process.env.AWS_S3_BUCKET
      });

      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to process profile picture",
        token,
        user: null,
        imageUrl: null,
        s3url: null,
        isUpdate: false
      };
    }
  }
};