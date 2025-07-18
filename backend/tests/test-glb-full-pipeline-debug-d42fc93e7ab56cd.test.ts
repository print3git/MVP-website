import { generateModel } from "../src/pipeline/generateModel";
import * as textToImage from "../src/lib/textToImage";
import * as imageToText from "../src/lib/imageToText";
import * as prepareImage from "../src/lib/prepareImage";
import * as sparc3d from "../src/lib/sparc3dClient";
import * as preserveColors from "../src/lib/preserveColors";
import * as storeGlb from "../src/lib/storeGlb";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";

function parseS3(url: string) {
  const match = url.match(
    /^https:\/\/(.+)\.s3\.([^.]+)\.amazonaws\.com\/(.+)$/,
  );
  if (!match) throw new Error("unexpected s3 url" + url);
  return { bucket: match[1], region: match[2], key: match[3] };
}

describe("debug glb full pipeline", () => {
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
      console.warn("Skipping pipeline debug test due to missing", v);
      test.skip("glb pipeline debug", () => {});
      return;
    }
  }

  test("runs pipeline end-to-end with detailed logging", async () => {
    const spy = <T extends (...args: any[]) => any>(
      obj: Record<string, any>,
      fn: keyof T,
    ) => {
      const original = (obj as any)[fn];
      return jest
        .spyOn(obj as any, fn)
        .mockImplementation(async (...args: any[]) => {
          console.log(`${String(fn)} start`);
          try {
            const res = await original.apply(obj, args);
            console.log(`${String(fn)} success`);
            return res;
          } catch (err) {
            console.error(`${String(fn)} failed`, err);
            throw err;
          }
        });
    };

    spy(textToImage, "textToImage");
    spy(imageToText, "imageToText");
    spy(prepareImage, "prepareImage");
    spy(sparc3d, "generateGlb");
    spy(preserveColors, "preserveColors");
    spy(storeGlb, "storeGlb");

    const prompt = "debug cube";
    const url = await generateModel({ prompt });
    console.log("generateModel url", url);
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
    const buf = new Uint8Array(await resp.arrayBuffer());
    expect(buf.byteLength).toBeGreaterThan(5 * 1024);
  }, 600000);
});
