jest.mock("../src/lib/uploadS3.js", () => ({
  uploadFile: jest.fn(),
}));
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: jest.fn(),
}));

const nock = require("nock");

process.env.http_proxy = "http://proxy:8080";
process.env.https_proxy = "http://proxy:8080";
process.env.HTTP_PROXY = "http://proxy:8080";
process.env.HTTPS_PROXY = "http://proxy:8080";

delete process.env.http_proxy;
delete process.env.https_proxy;
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;

const { textToImage } = require("../src/lib/textToImage.js");
const s3 = require("../src/lib/uploadS3.js");

describe("textToImage proxy cleanup", () => {
  beforeEach(() => {
    process.env.STABILITY_KEY = "abc";
    process.env.AWS_REGION = "us-east-1";
    process.env.S3_BUCKET = "bucket";
    process.env.CLOUDFRONT_DOMAIN = "cdn.test";
    s3.uploadFile.mockResolvedValue("https://cdn.test/image.png");
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
    jest.restoreAllMocks();
  });

  test("uses nock endpoint even when proxy env was set", async () => {
    const png = Buffer.from("png");
    nock("https://api.stability.ai")
      .post("/v2beta/stable-image/generate/core")
      .reply(200, png, { "Content-Type": "image/png" });

    const url = await textToImage("hello");
    expect(url).toBe("https://cdn.test/image.png");
  });
});
