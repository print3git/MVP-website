import { storeGlb } from "../src/lib/storeGlb";
import * as aws from "@aws-sdk/client-s3";

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(),
  PutObjectCommand: jest.fn(),
}));

describe("storeGlb edge cases", () => {
  const makeData = () => {
    const buf = Buffer.alloc(12);
    buf.write("glTF", 0);
    buf.writeUInt32LE(2, 4);
    buf.writeUInt32LE(12, 8);
    return buf;
  };

  beforeEach(() => {
    process.env.AWS_REGION = "us-east-1";
    process.env.S3_BUCKET = "bucket";
    process.env.AWS_ACCESS_KEY_ID = "id";
    process.env.AWS_SECRET_ACCESS_KEY = "secret";
  });

  afterEach(() => {
    jest.resetAllMocks();
    delete process.env.AWS_REGION;
    delete process.env.S3_BUCKET;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
  });

  test("throws when bucket env missing", async () => {
    delete process.env.S3_BUCKET;
    await expect(storeGlb(makeData())).rejects.toThrow("S3_BUCKET is not set");
  });

  test("retries send on network error", async () => {
    const send = jest
      .fn()
      .mockRejectedValueOnce(new Error("net"))
      .mockResolvedValueOnce({});
    (aws as any).S3Client.mockImplementation(() => ({ send }));

    const url = await storeGlb(makeData());
    expect(send).toHaveBeenCalledTimes(2);
    expect(url).toMatch(
      /^https:\/\/bucket\.s3\.us-east-1\.amazonaws\.com\/models\/\d+-[a-z0-9]+\.glb$/,
    );
  });

  test("rejects unsupported extension", async () => {
    await expect(storeGlb(makeData(), "model.txt")).rejects.toThrow(
      "Unsupported file extension",
    );
  });

  test("successful upload returns url", async () => {
    const send = jest.fn().mockResolvedValue({});
    (aws as any).S3Client.mockImplementation(() => ({ send }));
    const data = makeData();

    const url = await storeGlb(data, "model.glb");

    expect(aws.PutObjectCommand).toHaveBeenCalledWith({
      Bucket: "bucket",
      Key: expect.stringMatching(/^models\/\d+-[a-z0-9]+\.glb$/),
      Body: data,
      ContentType: "model/gltf-binary",
      ACL: "public-read",
    });
    expect(url).toMatch(
      /^https:\/\/bucket\.s3\.us-east-1\.amazonaws\.com\/models\/\d+-[a-z0-9]+\.glb$/,
    );
    expect(send).toHaveBeenCalled();
  });
});
