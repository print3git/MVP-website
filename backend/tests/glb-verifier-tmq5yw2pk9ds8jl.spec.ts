import { generateModel } from "../src/pipeline/generateModel";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { NodeIO } from "@gltf-transform/core";

function parseS3(url: string) {
  const match = url.match(
    /^https:\/\/(.+)\.s3\.([^.]+)\.amazonaws\.com\/(.+)$/,
  );
  if (!match) throw new Error("unexpected s3 url" + url);
  return { bucket: match[1], region: match[2], key: match[3] };
}

describe("post-merge glb verification", () => {
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
      console.warn("Skipping glb verifier test due to missing", v);
      test.skip("glb verifier", () => {});
      return;
    }
  }

  test("pipeline produces a valid glb", async () => {
    const url = await generateModel({ prompt: "post-merge test cube" });
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

    const res = await fetch(url);
    expect(res.status).toBe(200);
    const data = Buffer.from(await res.arrayBuffer());
    expect(data.slice(0, 4).toString()).toBe("glTF");

    const io = new NodeIO();
    const doc = await io.readBinary(data);
    const root = doc.getRoot();
    expect(root.listScenes().length).toBeGreaterThan(0);
    expect(root.listMeshes().length).toBeGreaterThan(0);
    for (const accessor of root.listAccessors()) {
      const arr = accessor.getArray();
      expect(arr && arr.length).toBeGreaterThan(0);
    }
  }, 300000);
});
