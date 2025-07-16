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
  const normalized = path.normalize(filePath);
  const resolved = path.resolve(normalized);
  const uploadsDir = path.resolve("uploads");
  if (!resolved.startsWith("/tmp") && !resolved.startsWith(uploadsDir)) {
    throw new Error("file not found");
  }
  if (!fs.existsSync(resolved)) {
    throw new Error("file not found");
  }
  filePath = resolved;
  const region = process.env.AWS_REGION;
  const bucket = process.env.S3_BUCKET;
  const domain =
    process.env.CLOUDFRONT_DOMAIN || process.env.CLOUDFRONT_MODEL_DOMAIN;

  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!region) throw new Error("AWS_REGION is not set");
  if (!bucket) throw new Error("S3_BUCKET is not set");
  if (!domain) throw new Error("CLOUDFRONT_DOMAIN is not set");
  if (!accessKey || !secretKey) throw new Error("AWS credentials are not set");
  const client = new S3Client({ region });
  const key = `images/${Date.now()}-${path.basename(filePath)}`;
  const body = fs.readFileSync(filePath);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,

      Body: fs.createReadStream(filePath),
      ContentType: contentType,
    }),
  );
  return `https://${domain}/${key}`;
}
