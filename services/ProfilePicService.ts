import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3ClientConfig, ObjectCannedACL } from "@aws-sdk/client-s3";
import prisma from "../models/prismaClient";
import { verifyToken } from "../utils/jwt";
import { v4 as uuidv4 } from "uuid";
import { Readable } from "stream";

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

export interface FileUpload {
  file?: {
    filename: string;
    mimetype: string;
    encoding: string;
    createReadStream: () => Readable;
  };
  filename?: string;
  mimetype?: string;
  encoding?: string;
  createReadStream?: () => Readable;
}

export const profileUploadService = {
  async uploadProfilePicture(file: FileUpload, token: string) {
    try {
      if (!file) {
        throw new Error("File is missing");
      }
      console.log("file", file);

      const { filename, mimetype, createReadStream } = file.file || file;

      if (!filename) throw new Error("File name is missing");
      if (!mimetype) throw new Error("File mime type is missing");
      if (!createReadStream || typeof createReadStream !== "function") {
        throw new Error("File stream is invalid");
      }

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
      // create a unique file name for the uploaded file
      const s3FileName = `profile-pictures/${
        decoded.userId
      }/${uuidv4()}.${fileExtension}`;
      // create a readable stream from the file
      const fileStream = createReadStream();

      fileStream.on("error", (err) => {
        console.error("Error reading file stream:", err);
        throw new Error("Error reading file stream");
      });
      // use the Upload class from @aws-sdk/lib-storage
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
      // wait for the upload to complete
      await upload.done();

      const getObjectParams = { Bucket: BUCKET_NAME, Key: s3FileName };
      // get a signed url for the uploaded file
      const presignedUrl = await getSignedUrl(
        s3Client,
        new GetObjectCommand(getObjectParams)
      );
      // creates a presigned url for the uploaded file
      const s3ImageUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3FileName}`;
      // upload the profile picture in the database
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
