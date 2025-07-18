import request from "supertest";
import nock from "nock";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import app from "../server";

function parseS3(url: string) {
  const match = url.match(
    /^https:\/\/(.+)\.s3\.([^.]+)\.amazonaws\.com\/(.+)$/,
  );
  if (!match) throw new Error("unexpected s3 url" + url);
  return { bucket: match[1], region: match[2], key: match[3] };
}

describe("full pipeline e2e via api", () => {
  const required = [
    "AWS_REGION",
    "S3_BUCKET",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "SPARC3D_ENDPOINT",
    "SPARC3D_TOKEN",
    "STRIPE_SECRET_KEY",
    "HF_TOKEN",
  ];

  for (const v of required) {
    if (!process.env[v]) {
      console.warn("Skipping e2e test due to missing", v);
      test.skip("full pipeline", () => {});
      return;
    }
  }

  test("POST /api/generate returns downloadable glb", async () => {
    nock.enableNetConnect();
    const res = await request(app)
      .post("/api/generate")
      .send({ prompt: "test" });
    expect(res.status).toBe(200);
    const url = res.body.glb_url as string;
    expect(url).toMatch(/\.glb$/);

    const { bucket, region, key } = parseS3(url);
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
    expect(head.ContentLength).toBeGreaterThan(5 * 1024);
    expect(head.ContentType).toBe("model/gltf-binary");

    const resp = await fetch(url);
    expect(resp.status).toBe(200);
    const data = new Uint8Array(await resp.arrayBuffer());
    expect(data.byteLength).toBeGreaterThan(5 * 1024);
  }, 300000);
});
