"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = uploadFile;
const fs_1 = __importDefault(require("fs"));
const client_s3_1 = require("@aws-sdk/client-s3");
const path_1 = __importDefault(require("path"));
/**
 * Upload a file to S3 and return its public CloudFront URL
 * @param {string} filePath local path of file to upload
 * @param {string} contentType MIME type for the object
 * @returns {Promise<string>} public URL of uploaded file
 */
async function uploadFile(filePath, contentType) {
  const region = process.env.AWS_REGION;
  const bucket = process.env.S3_BUCKET;
  const domain =
    process.env.CLOUDFRONT_DOMAIN || process.env.CLOUDFRONT_MODEL_DOMAIN;
  if (!region) throw new Error("AWS_REGION is not set");
  if (!bucket) throw new Error("S3_BUCKET is not set");
  if (!domain) throw new Error("CLOUDFRONT_DOMAIN is not set");
  const client = new client_s3_1.S3Client({ region });
  const key = `images/${Date.now()}-${path_1.default.basename(filePath)}`;
  const body = fs_1.default.readFileSync(filePath);
  await client.send(
    new client_s3_1.PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return `https://${domain}/${key}`;
}
