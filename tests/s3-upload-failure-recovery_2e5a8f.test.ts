const sendMock = jest.fn();

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
  PutObjectCommand: jest.fn(),
}));

import { storeGlb } from "../backend/src/lib/storeGlb";

function makeGlb() {
  const buf = Buffer.alloc(12);
  buf.write("glTF", 0);
  buf.writeUInt32LE(2, 4);
  buf.writeUInt32LE(12, 8);
  return buf;
}

describe("S3 upload retry", () => {
  beforeEach(() => {
    sendMock.mockReset();
    process.env.AWS_REGION = "us-east-1";
    process.env.S3_BUCKET = "bucket";
    process.env.AWS_ACCESS_KEY_ID = "id";
    process.env.AWS_SECRET_ACCESS_KEY = "secret";
  });

  test("retries once then succeeds", async () => {
    sendMock
      .mockRejectedValueOnce(
        Object.assign(new Error("fail"), { name: "NetworkingError" }),
      )
      .mockResolvedValueOnce({});
    const url = await storeGlb(makeGlb(), 2);
    expect(url).toMatch(
      /^https:\/\/bucket\.s3\.us-east-1\.amazonaws\.com\/models\//,
    );
    expect(sendMock).toHaveBeenCalledTimes(2);
  });
});
