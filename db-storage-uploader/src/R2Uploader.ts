import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";

// Load env vars early
dotenv.config();

export class R2Uploader {
  private s3: S3Client;
  private bucketName: string;

  constructor() {
    this.s3 = new S3Client({
      region: process.env.R2_BUCKET_REGION || "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });

    this.bucketName = process.env.R2_BUCKET_NAME!;
  }

  async uploadFile(key: string, body: Buffer | Blob) {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: body,
    });

    await this.s3.send(command);
    console.log(`✅ Uploaded ${key} to R2`);
  }
}

