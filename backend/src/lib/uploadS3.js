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
const env_1 = require("../env");
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
  const env = (0, env_1.getEnv)();
  const region = env.AWS_REGION || "us-east-1";
  const bucket = env.S3_BUCKET || "test-bucket";
  const domain = env.CLOUDFRONT_DOMAIN;
  const key = safeJoin(
    "images",
    `${Date.now()}-${path_1.default.basename(filePath)}`,
  );
  if (env.NODE_ENV !== "production" && !domain) {
    return "/models/test.glb";
  }
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
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
  const env = (0, env_1.getEnv)();
  const region = env.AWS_REGION || "us-east-1";
  const bucket = env.S3_BUCKET || "test-bucket";
  const domain = env.CLOUDFRONT_DOMAIN;
  const key = safeJoin("models", `${Date.now()}-${filename}`);
  if (env.NODE_ENV !== "production" && !domain) {
    return { url: "/models/test.glb", key };
  }
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
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
