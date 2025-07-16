import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import path from "path";
import { resolveLocalFile } from "./fileUtils";

function safeJoin(base: string, userPath: string) {
  const target = path.normalize(
    path.isAbsolute(userPath) ? userPath : path.join(base, userPath),
  );
  if (!target.startsWith(path.normalize(base + path.sep))) {
    throw new Error("Invalid path");
  }
  return target;
}

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
  filePath = resolveLocalFile(filePath, ["/tmp", "uploads"], "file not found");
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
  const key = safeJoin("images", `${Date.now()}-${path.basename(filePath)}`);
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
