"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadS3 = exports.uploadFile = void 0;
const fs_1 = __importDefault(require("fs"));
const client_s3_1 = require("@aws-sdk/client-s3");
const path_1 = __importDefault(require("path"));
const fileUtils_1 = require("./fileUtils");
const getEnv_1 = require("./getEnv");
function safeJoin(base, userPath) {
  const target = path_1.default.normalize(
    path_1.default.isAbsolute(userPath)
      ? userPath
      : path_1.default.join(base, userPath),
  );
  if (!target.startsWith(path_1.default.normalize(base + path_1.default.sep))) {
    throw new Error("Invalid path");
  }
  return target;
}
async function uploadFile(filePath, contentType) {
  filePath = (0, fileUtils_1.resolveLocalFile)(
    filePath,
    ["/tmp", "uploads"],
    "file not found",
  );
  const region = (0, getEnv_1.getEnv)("AWS_REGION", {
    defaultValue: "us-east-1",
  });
  const bucket = (0, getEnv_1.getEnv)("S3_BUCKET", {
    defaultValue: "test-bucket",
  });
  const domain =
    (0, getEnv_1.getEnv)("CLOUDFRONT_DOMAIN", {
      defaultValue: "cdn.example.com",
    }) ||
    (0, getEnv_1.getEnv)("CLOUDFRONT_MODEL_DOMAIN", {
      defaultValue: "cdn.example.com",
    });
  const key = safeJoin(
    "images",
    `${Date.now()}-${path_1.default.basename(filePath)}`,
  );
  if (
    process.env.NODE_ENV === "test" ||
    !process.env.AWS_ACCESS_KEY_ID ||
    !process.env.AWS_SECRET_ACCESS_KEY
  ) {
    return `https://${domain}/${key}`;
  }
  const client = new client_s3_1.S3Client({ region });
  await client.send(
    new client_s3_1.PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fs_1.default.createReadStream(filePath),
      ContentType: contentType,
    }),
  );
  return `https://${domain}/${key}`;
}
exports.uploadFile = uploadFile;
async function uploadS3(data, filename = "model.glb") {
  const region = (0, getEnv_1.getEnv)("AWS_REGION", {
    defaultValue: "us-east-1",
  });
  const bucket = (0, getEnv_1.getEnv)("S3_BUCKET", {
    defaultValue: "test-bucket",
  });
  const domain = (0, getEnv_1.getEnv)("CLOUDFRONT_DOMAIN", {
    defaultValue: "cdn.example.com",
  });
  const key = safeJoin("models", `${Date.now()}-${filename}`);
  if (
    process.env.NODE_ENV === "test" ||
    !process.env.AWS_ACCESS_KEY_ID ||
    !process.env.AWS_SECRET_ACCESS_KEY
  ) {
    return { url: `https://${domain}/${key}`, key };
  }
  const client = new client_s3_1.S3Client({ region });
  await client.send(
    new client_s3_1.PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: data,
      ContentType: "model/gltf-binary",
    }),
  );
  return { url: `https://${domain}/${key}`, key };
}
exports.uploadS3 = uploadS3;
