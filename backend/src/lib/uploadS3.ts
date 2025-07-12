import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import path from "path";

/**
 * Upload a file to S3 and return its public CloudFront URL
 * @param {string} filePath local path of file to upload
 * @param {string} contentType MIME type for the object
 * @returns {Promise<string>} public URL of uploaded file
 */
export async function uploadFile(
  filePath: string,
  contentType: string,
): Promise<string> {
  const region = process.env.AWS_REGION;
  const bucket = process.env.S3_BUCKET;
  const domain =
    process.env.CLOUDFRONT_DOMAIN || process.env.CLOUDFRONT_MODEL_DOMAIN;
  if (!region) throw new Error("AWS_REGION is not set");
  if (!bucket) throw new Error("S3_BUCKET is not set");
  if (!domain) throw new Error("CLOUDFRONT_DOMAIN is not set");
  const client = new S3Client({ region });
  const key = `images/${Date.now()}-${path.basename(filePath)}`;
  const body = fs.readFileSync(filePath);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return `https://${domain}/${key}`;
}
