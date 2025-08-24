import fs from "fs";
import path from "path";
import { uploadFile } from "../src/lib/uploadS3";

describe("uploadFile env validation", () => {
  const tmp = path.join("/tmp", "test-upload");
  beforeAll(() => {
    fs.writeFileSync(tmp, "data");
  });

  afterAll(() => {
    fs.unlinkSync(tmp);
  });

  beforeEach(() => {
    process.env.AWS_REGION = "us-east-1";
    process.env.S3_BUCKET = "bucket";
    process.env.CLOUDFRONT_DOMAIN = "cdn.test";
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
  });

  afterEach(() => {
    delete process.env.AWS_REGION;
    delete process.env.S3_BUCKET;
    delete process.env.CLOUDFRONT_DOMAIN;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
  });

  test("throws when AWS credentials are missing", async () => {
    await expect(uploadFile(tmp, "image/png")).rejects.toThrow(
      "AWS credentials",
    );
  });

  test("rejects paths outside allowed dirs", async () => {
    await expect(uploadFile("/etc/passwd", "image/png")).rejects.toThrow(
      "file not found",
    );
    await expect(uploadFile("/tmp/../etc/passwd", "image/png")).rejects.toThrow(
      "file not found",
    );
    await expect(uploadFile("/tmpstuff/evil.png", "image/png")).rejects.toThrow(
      "file not found",
    );
  });
});
