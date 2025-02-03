import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3ClientConfig, ObjectCannedACL } from "@aws-sdk/client-s3";
import prisma from "../models/prismaClient";
import { verifyToken } from "../utils/jwt";
import { v4 as uuidv4 } from "uuid";
import { Readable } from "stream";
import { Buffer } from "buffer"; // Required for handling base64 encoding

console.log("AWS Region:", process.env.AWS_REGION);
console.log("AWS Bucket:", process.env.AWS_S3_BUCKET);
console.log("AWS Access Key exists:", !!process.env.AWS_ACCESS_KEY_ID);
console.log("AWS Secret Key exists:", !!process.env.AWS_SECRET_ACCESS_KEY);

if (
  !process.env.AWS_ACCESS_KEY_ID ||
  !process.env.AWS_SECRET_ACCESS_KEY ||
  !process.env.AWS_REGION
) {
  throw new Error(
    "AWS credentials are not properly configured in environment variables"
  );
}

const s3Config: S3ClientConfig = {
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

const s3Client = new S3Client(s3Config);
const BUCKET_NAME = process.env.AWS_S3_BUCKET;

export const profileUploadService = {
  async uploadProfilePicture(base64Data: string, token: string) {
    try {
      if (!base64Data) {
        throw new Error("Base64 data is missing");
      }

      let fileStream: Readable;
      let filename: string;
      let mimetype: string;

      // Extract file extension and mime type from the base64 data
      const matches = base64Data.match(/^data:(.+);base64,(.*)$/);
      if (!matches) throw new Error("Invalid base64 data format");

      mimetype = matches[1];
      const base64Image = matches[2];

      // Convert base64 to buffer
      const buffer = Buffer.from(base64Image, "base64");

      // Generate a unique filename (optional: you can infer it from the file)
      filename = `profile-${uuidv4()}`;
      
      // Create a readable stream from the buffer
      fileStream = Readable.from(buffer);

      console.log("Processing file:", { filename, mimetype });

      if (!token) throw new Error("Token is required");

      const decoded = verifyToken(token);
      if (!decoded || !decoded.userId) {
        throw new Error("Invalid or expired token");
      }

      const userId = BigInt(decoded.userId);
      const user = await prisma.userMaster.findUnique({
        where: { ID: userId },
      });

      if (!user) throw new Error("User not found");
      if (!BUCKET_NAME) throw new Error("AWS S3 bucket name is not configured");

      const fileExtension = filename.split(".").pop()?.toLowerCase();
      if (!fileExtension) throw new Error("Invalid file extension");

      // Create a unique file name for the uploaded file
      const s3FileName = `profile-pictures/${decoded.userId}/${uuidv4()}.${fileExtension}`;

      fileStream.on("error", (err) => {
        console.error("Error reading file stream:", err);
        throw new Error("Error reading file stream");
      });

      // Use the Upload class from @aws-sdk/lib-storage
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: BUCKET_NAME,
          Key: s3FileName,
          Body: fileStream,
          ContentType: mimetype,
          ACL: "private" as ObjectCannedACL,
        },
      });

      // Wait for the upload to complete
      await upload.done();

      const getObjectParams = { Bucket: BUCKET_NAME, Key: s3FileName };
      // Get a signed URL for the uploaded file
      const presignedUrl = await getSignedUrl(
        s3Client,
        new GetObjectCommand(getObjectParams)
      );

      // Create a public URL for the uploaded image
      const s3ImageUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3FileName}`;

      // Update the profile picture in the database
      await prisma.userMaster.update({
        where: { ID: userId },
        data: { profile_Picture: s3ImageUrl },
      });

      return {
        success: true,
        token,
        user,
        imageUrl: s3ImageUrl,
        presignedUrl,
        message: "Profile picture uploaded successfully",
      };
    } catch (error) {
      console.error("Error in uploadProfilePicture:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to upload profile picture",
        token,
        user: null,
        imageUrl: null,
        presignedUrl: null,
      };
    }
  },
};
