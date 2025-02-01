import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3ClientConfig, ObjectCannedACL } from '@aws-sdk/client-s3';
import prisma from '../models/prismaClient';
import { verifyToken } from '../utils/jwt';
import { createReadStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Ensure environment variables exist
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION) {
  throw new Error('AWS credentials are not properly configured in environment variables');
}

// Create the config object with proper typing
const s3Config: S3ClientConfig = {
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
};

const s3Client = new S3Client(s3Config);

const BUCKET_NAME = process.env.AWS_S3_BUCKET;

interface FileUpload {
  createReadStream: () => any;
  filename: string;
  mimetype: string;
  path: string;
}

export const profileUploadService = {
  async uploadProfilePicture(file: FileUpload, token: string) {
    try {
      // Verify the token and get user
      const decoded = verifyToken(token);
      if (!decoded || !decoded.userId) {
        throw new Error('Invalid or expired token');
      }

      // Check if user exists
      const user = await prisma.userMaster.findUnique({
        where: { ID: BigInt(decoded.userId) }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!BUCKET_NAME) {
        throw new Error('AWS S3 bucket name is not configured');
      }

      // Generate unique filename
      const fileExtension = file.mimetype.split('/')[1];
      const fileName = `profile-pictures/${decoded.userId}/${uuidv4()}.${fileExtension}`;

      // Upload file to S3 with proper typing for ACL
      const uploadParams = {
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: createReadStream(file.path),
        ContentType: file.mimetype,
        ACL: 'private' as ObjectCannedACL // Type assertion for ACL
      };

      await s3Client.send(new PutObjectCommand(uploadParams));

      // Generate presigned URL for viewing
      const getObjectParams = {
        Bucket: BUCKET_NAME,
        Key: fileName,
      };

      const presignedUrl = await getSignedUrl(
        s3Client,
        new GetObjectCommand(getObjectParams),
        { expiresIn: 3600 }
      );

      // Generate permanent S3 URL
      const s3ImageUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
      
      // Update user profile with the image URL using correct field name
      await prisma.userMaster.update({
        where: { ID: BigInt(decoded.userId) },
        data: { 
          profile_Picture: s3ImageUrl, // Make sure this matches your Prisma schema field name
        }
      });

      return {
        success: true,
        token,
        user,
        imageUrl: s3ImageUrl,
        presignedUrl,
        message: 'Profile picture uploaded successfully'
      };

    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to upload profile picture');
    }
  }
};