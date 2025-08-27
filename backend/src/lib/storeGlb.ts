import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getEnv } from "../env";

/**
 * Upload GLB data to S3 and return its public URL
 * @param data Buffer containing .glb bytes
 * @returns {Promise<string>} public URL of uploaded model
 */
export async function storeGlb(
  data: Buffer,
  attempts = 3,
): Promise<string> {
  if (data.length < 12 || data.toString("utf8", 0, 4) !== "glTF") {
    throw new Error("Invalid GLB");
  }
  const env = getEnv();
  const region = env.AWS_REGION || "us-east-1";
  const bucket = env.S3_BUCKET || "test-bucket";
  const accessKeyId = process.env["AWS_ACCESS_KEY_ID"];
  const secretAccessKey = process.env["AWS_SECRET_ACCESS_KEY"];
  const key = `models/${Date.now()}-${Math.random().toString(36).slice(2)}.glb`;

  if (env.NODE_ENV !== "production" && !env.CLOUDFRONT_MODEL_DOMAIN) {
    return "/models/test.glb";
  }

  if (
    env.NODE_ENV === "test" ||
    !accessKeyId ||
    !secretAccessKey
  ) {
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
  for (let i = 0; i < attempts; i++) {
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: data,
          ContentType: "model/gltf-binary",
          ACL: "public-read",
        }),
      );
      break;
    } catch (err: any) {
      const isNetworkError =
        err?.name === "NetworkingError" || /network/i.test(err?.message || "");
      if (!isNetworkError || i === attempts - 1) {
        throw err;
      }
    }
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
