import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import path from "path";
import { resolveLocalFile } from "./fileUtils";
import { getEnv } from "../env";

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
  const env = getEnv();
  const region = env.AWS_REGION || "us-east-1";
  const bucket = env.S3_BUCKET || "test-bucket";
  const domain = env.CLOUDFRONT_DOMAIN;

  const key = safeJoin("images", `${Date.now()}-${path.basename(filePath)}`);
  if (env.NODE_ENV !== "production" && !domain) {
    return "/models/test.glb";
  }
  if (
    env.NODE_ENV === "test" ||
    !process.env.AWS_ACCESS_KEY_ID ||
    !process.env.AWS_SECRET_ACCESS_KEY
  ) {
    return `https://${domain}/${key}`;
  }

  const client = new S3Client({ region });
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

export interface UploadResult {
  url: string;
  key: string;
}

function sanitizeKey(name: string): string {
  const base = name.split(/[\\/]/).pop() || "model";
  let cleaned = base.replace(/\.glb$/i, "");
  cleaned = cleaned.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  if (cleaned.length > 80) cleaned = cleaned.slice(0, 80);
  return `${cleaned}.glb`;
}

/**
 * Upload raw data to S3 and return its public URL and object key.
 * In test environments or when credentials are missing, returns a
 * deterministic mocked URL without performing any network requests.
 */
export async function uploadS3(
  data: Buffer,
  filename = "model.glb",
): Promise<UploadResult> {
  const env = getEnv();
  const region = env.AWS_REGION || "us-east-1";
  const bucket = env.S3_BUCKET || "test-bucket";
  const domain = env.CLOUDFRONT_DOMAIN;
  const key = safeJoin("models", sanitizeKey(`${Date.now()}-${filename}`));

  if (env.NODE_ENV !== "production" && !domain) {
    return { url: "/models/test.glb", key };
  }
  if (
    env.NODE_ENV === "test" ||
    !process.env.AWS_ACCESS_KEY_ID ||
    !process.env.AWS_SECRET_ACCESS_KEY
  ) {
    return { url: `https://${domain}/${key}`, key };
  }

  const client = new S3Client({ region });
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: data,
      ContentType: "model/gltf-binary",
    }),
  );
  return { url: `https://${domain}/${key}`, key };
}
