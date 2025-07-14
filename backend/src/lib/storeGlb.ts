import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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
  const region = process.env.AWS_REGION;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!region) throw new Error("AWS_REGION is not set");
  if (!bucket) throw new Error("S3_BUCKET is not set");
  if (!accessKeyId) throw new Error("AWS_ACCESS_KEY_ID is not set");
  if (!secretAccessKey) throw new Error("AWS_SECRET_ACCESS_KEY is not set");
  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
  const key = `models/${Date.now()}-${Math.random().toString(36).slice(2)}.glb`;
  let lastError: any;
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
      lastError = undefined;
      break;
    } catch (err: any) {
      lastError = err;
      const isNetworkError =
        err?.name === "NetworkingError" || /network/i.test(err?.message || "");
      if (!isNetworkError || i === attempts - 1) {
        throw err;
      }
    }
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
