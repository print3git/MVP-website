import fs from "fs";
import path from "path";
import {
  S3Client,
  HeadObjectCommand,
  GetObjectAclCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { storeGlb } from "../src/lib/storeGlb";

function parseS3(url: string) {
  const match = url.match(
    /^https:\/\/(.+)\.s3\.([^.]+)\.amazonaws\.com\/(.+)$/,
  );
  if (!match) throw new Error("unexpected s3 url" + url);
  return { bucket: match[1], region: match[2], key: match[3] };
}

describe("s3 upload integrity", () => {
  const required = [
    "AWS_REGION",
    "S3_BUCKET",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
  ];
  for (const v of required) {
    if (!process.env[v]) {
      console.warn("Skipping s3 integration test due to missing", v);
      test.skip("s3 upload", () => {});
      return;
    }
  }

  test("uploads, verifies permissions, downloads, and cleans up", async () => {
    const glbPath = path.resolve(__dirname, "../../models/bag.glb");
    const data = fs.readFileSync(glbPath);
    const url = await storeGlb(data);
    const { bucket, region, key } = parseS3(url);
    const client = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    const head = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: key }),
    );
    expect(head.$metadata.httpStatusCode).toBe(200);

    const acl = await client.send(
      new GetObjectAclCommand({ Bucket: bucket, Key: key }),
    );
    const publicRead = acl.Grants?.some(
      (g) =>
        g.Grantee?.URI === "http://acs.amazonaws.com/groups/global/AllUsers" &&
        g.Permission === "READ",
    );
    expect(publicRead).toBe(true);

    const get = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    const downloaded = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = get.Body as any;
      stream.on("data", (c: Buffer) => chunks.push(c));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });
    expect(downloaded.equals(data)).toBe(true);

    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }, 60000);
});
