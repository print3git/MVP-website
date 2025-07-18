import fs from "fs";
import path from "path";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { storeGlb } from "../src/lib/storeGlb";

function parseS3(url: string) {
  const match = url.match(
    /^https:\/\/(.+)\.s3\.([^.]+)\.amazonaws\.com\/(.+)$/,
  );
  if (!match) throw new Error("unexpected s3 url" + url);
  return { bucket: match[1], region: match[2], key: match[3] };
}

describe("glb upload to s3", () => {
  const required = [
    "AWS_REGION",
    "S3_BUCKET",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
  ];
  for (const v of required) {
    if (!process.env[v]) {
      console.warn("Skipping s3 upload test due to missing", v);
      test.skip("glb upload", () => {});
      return;
    }
  }

  test("uploads glb and is accessible", async () => {
    const glbPath = path.resolve(__dirname, "../../models/bag.glb");
    const data = fs.readFileSync(glbPath);
    const url = await storeGlb(data);
    const { bucket, region, key } = parseS3(url);
    expect(bucket).toBe(process.env.S3_BUCKET);
    expect(region).toBe(process.env.AWS_REGION);
    expect(key).toMatch(/^models\/\d+-[a-z0-9]+\.glb$/);
    const s3 = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    const head = await s3.send(
      new HeadObjectCommand({ Bucket: bucket, Key: key }),
    );
    expect(head.$metadata.httpStatusCode).toBe(200);
    const res = await fetch(url, { method: "HEAD" });
    expect(res.status).toBe(200);
  }, 30000);
});
