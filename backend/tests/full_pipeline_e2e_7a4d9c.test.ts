import { generateModel } from "../src/pipeline/generateModel";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import Stripe from "stripe";

function parseS3(url: string) {
  const match = url.match(
    /^https:\/\/(.+)\.s3\.([^.]+)\.amazonaws\.com\/(.+)$/,
  );
  if (!match) throw new Error("unexpected s3 url" + url);
  return { bucket: match[1], region: match[2], key: match[3] };
}

describe("full pipeline e2e", () => {
  const required = [
    "AWS_REGION",
    "S3_BUCKET",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "SPARC3D_ENDPOINT",
    "SPARC3D_TOKEN",
    "STRIPE_SECRET_KEY",
  ];

  for (const v of required) {
    if (!process.env[v]) {
      console.warn("Skipping e2e test due to missing", v);
      test.skip("full pipeline", () => {});
      return;
    }
  }

  test("generates and uploads glb", async () => {
    const url = await generateModel({ prompt: "hello" });
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

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2022-11-15",
    });
    const balance = await stripe.balance.retrieve();
    expect(balance.object).toBe("balance");
    console.log("Triggered AWS S3, Hugging Face, and Stripe APIs");
  }, 300000);
});
