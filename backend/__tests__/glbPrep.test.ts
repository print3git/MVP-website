import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
const cleanupGlbArtifacts = require("../../scripts/cleanupGlbArtifacts.js");

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(),
  PutObjectCommand: jest.fn(),
}));

const uploadModule = require("../src/lib/uploadS3");
const { uploadFile } = uploadModule;
import { prepareImage } from "../src/lib/prepareImage.ts";
let mockedUpload: jest.SpyInstance;

describe("glb prep helpers", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.AWS_REGION = "us-east-1";
    process.env.S3_BUCKET = "bucket";
    process.env.CLOUDFRONT_DOMAIN = "cdn.test";
    process.env.AWS_ACCESS_KEY_ID = "id";
    process.env.AWS_SECRET_ACCESS_KEY = "secret";
    (S3Client as jest.Mock).mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({}),
    }));
    mockedUpload = jest.spyOn(uploadModule, "uploadFile");
  });

  afterEach(() => {
    delete process.env.AWS_REGION;
    delete process.env.S3_BUCKET;
    delete process.env.CLOUDFRONT_DOMAIN;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
  });

  test("uploadFile success returns cloudfront url", async () => {
    const send = jest.fn().mockResolvedValue({});
    (S3Client as jest.Mock).mockImplementation(() => ({ send }));
    const tmp = path.join("/tmp", "t.glb");
    fs.writeFileSync(tmp, "data");
    const url = await uploadFile(tmp, "model/gltf-binary");
    expect(send).toHaveBeenCalled();
    expect(url).toMatch(/^https:\/\/cdn\.test\/images\//);
    // leave tmp file for the mock stream
  });

  test("uploadFile propagates s3 errors", async () => {
    const err = new Error("fail");
    const send = jest.fn().mockRejectedValue(err);
    (S3Client as jest.Mock).mockImplementation(() => ({ send }));
    const tmp = path.join("/tmp", "t.glb");
    fs.writeFileSync(tmp, "data");
    await expect(uploadFile(tmp, "model/gltf-binary")).rejects.toThrow("fail");
    // leave tmp file for the mock stream
  });

  test("prepareImage leaves http urls unchanged", async () => {
    const url = await prepareImage("http://example.com/file.png");
    expect(url).toBe("http://example.com/file.png");
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  test("prepareImage rejects traversal paths", async () => {
    await expect(prepareImage("/etc/passwd")).rejects.toThrow(
      "image file not found",
    );
  });
});

afterAll(() => {
  cleanupGlbArtifacts();
});
