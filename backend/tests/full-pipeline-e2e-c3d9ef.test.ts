import request from "supertest";
import nock from "nock";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import app from "../server";
import * as textToImage from "../src/lib/textToImage";
import * as sparc3d from "../src/lib/sparc3dClient";
import * as storeGlb from "../src/lib/storeGlb";

function parseS3(url: string) {
  const match = url.match(
    /^https:\/\/(.+)\.s3\.([^.]+)\.amazonaws\.com\/(.+)$/,
  );
  if (!match) throw new Error("unexpected s3 url" + url);
  return { bucket: match[1], region: match[2], key: match[3] };
}

describe("full pipeline endpoint e2e", () => {
  const required = [
    "AWS_REGION",
    "S3_BUCKET",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "SPARC3D_ENDPOINT",
    "SPARC3D_TOKEN",
    "STABILITY_KEY",
  ];

  for (const v of required) {
    if (!process.env[v]) {
      console.warn("Skipping e2e test due to missing", v);
      test.skip("full pipeline", () => {});
      return;
    }
  }

  test("POST /api/generate generates glb and uploads", async () => {
    nock.enableNetConnect();
    const textSpy = jest.spyOn(textToImage, "textToImage");
    const glbSpy = jest.spyOn(sparc3d, "generateGlb");
    const storeSpy = jest.spyOn(storeGlb, "storeGlb");

    const prompt = "e2e cube";
    const res = await request(app).post("/api/generate").send({ prompt });
    expect(res.status).toBe(200);
    const url = res.body.glb_url;
    expect(url).toMatch(/\.glb$/);

    expect(textSpy).toHaveBeenCalledWith(prompt);
    expect(glbSpy).toHaveBeenCalled();
    expect(storeSpy).toHaveBeenCalledWith(expect.any(Buffer));

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
    expect(head.ContentType).toBe("model/gltf-binary");
    expect(head.ContentLength).toBeGreaterThan(5 * 1024);

    const fetchRes = await fetch(url);
    expect(fetchRes.status).toBe(200);
    const buffer = Buffer.from(await fetchRes.arrayBuffer());
    expect(buffer.length).toBeGreaterThan(0);
  }, 300000);
});
