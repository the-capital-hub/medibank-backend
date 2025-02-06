import { S3Client, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import prisma from "../models/prismaClient";
import { verifyToken } from "../utils/jwt";
import { v4 as uuidv4 } from "uuid";
import { Buffer } from "buffer";

const DEFAULT_PROFILE_PICTURE = 'https://profilepic-medibank.s3.ap-south-1.amazonaws.com/profile-pictures/38/6aca6448-929c-4347-bd33-4dfcb00343d4.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIA2OAJUCQXAIXFNMGA%2F20250205%2Fap-south-1%2Fs3%2Faws4_request&X-Amz-Date=20250205T131225Z&X-Amz-Expires=604800&X-Amz-Signature=8bdab29a83d1c8d7d5ba0fbfcefe42807b78fce71df0c5eb8e475bcd00c3f0f7&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject';

const BUCKET_NAME = process.env.AWS_S3_BUCKET;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const getExtensionFromMimetype = (mime: string) => {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif'
  };
  return extensions[mime] || 'jpg';
};

const parseBase64Image = (base64Data: string) => {
  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  
  if (matches && matches.length === 3) {
    return {
      mimeType: matches[1],
      buffer: Buffer.from(matches[2], 'base64')
    };
  }
  
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
  
  return 'image/jpeg';
};

const extractS3KeyFromUrl = (url: string): string | null => {
  try {
    if (!url) return null;
    
    if (url.includes('?')) {
      const baseUrl = url.split('?')[0];
      const matches = baseUrl.match(/amazonaws\.com\/(.+)$/);
      return matches ? matches[1] : null;
    }
    
    const matches = url.match(/amazonaws\.com\/(.+)$/);
    return matches ? matches[1] : null;
  } catch (error) {
    console.error("Error extracting S3 key:", error);
    return null;
  }
};

const generatePresignedUrl = async (key: string): Promise<string> => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
  };
  return await getSignedUrl(s3Client, new GetObjectCommand(params), { expiresIn: 7 * 24 * 60 * 60 });
};

export const profileUploadService = {
  async uploadProfileAfterVerification(base64Data: string | null, token: string) {
    try {
      // Validate token and user
      if (!token) throw new Error("Token is required");
      const decoded = verifyToken(token);
      if (!decoded?.userId) throw new Error("Invalid token");

      const user = await prisma.userMaster.findUnique({ 
        where: { ID: BigInt(decoded.userId) }
      });
      
      if (!user) throw new Error("User not found");

      // If no base64Data is provided, check if user already has a profile picture
      if (!base64Data) {
        // If user has no existing profile picture, set default
        if (!user.profile_Picture) {
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

        // If user already has a profile picture, return existing picture
        return {
          success: true,
          token,
          user,
          imageUrl: user.profile_Picture,
          s3url: user.profile_Picture,
          message: 'Existing profile picture retained',
          isUpdate: true
        };
      }

      // Process and validate new image
      const { buffer, mimeType: detectedMimeType } = parseBase64Image(base64Data);
      
      if (buffer.length > MAX_FILE_SIZE) {
        throw new Error('File size exceeds maximum limit of 5MB');
      }

      const mimetype = detectedMimeType || detectMimeType(buffer);
      
      if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
        throw new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed');
      }

      // Generate new file name
      const fileExtension = getExtensionFromMimetype(mimetype);
      const s3FileName = `profile-pictures/${decoded.userId}/${uuidv4()}.${fileExtension}`;

      // Delete existing profile picture if exists
      if (user.profile_Picture) {
        const oldS3Key = extractS3KeyFromUrl(user.profile_Picture);
        if (oldS3Key) {
          try {
            await s3Client.send(new DeleteObjectCommand({
              Bucket: BUCKET_NAME,
              Key: oldS3Key
            }));
          } catch (error) {
            console.warn("Failed to delete old profile picture:", error);
          }
        }
      }

      // Upload new image
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: BUCKET_NAME,
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
      const s3ImageUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3FileName}`;

      // Update database
      const updatedUser = await prisma.userMaster.update({
        where: { ID: BigInt(decoded.userId) },
        data: {
          profile_Picture: presignedUrl,
          UpdatedOn: new Date()
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
      console.error("Error in profile picture handling:", error);
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