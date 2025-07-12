jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: jest.fn(),
}));
jest.mock("../src/lib/uploadS3.js", () => ({
  uploadFile: jest.fn(),
}));

process.env.http_proxy = "http://proxy:8080";
process.env.https_proxy = "http://proxy:8080";
process.env.HTTP_PROXY = "http://proxy:8080";
process.env.HTTPS_PROXY = "http://proxy:8080";

delete process.env.http_proxy;
delete process.env.https_proxy;
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;

const nock = require("nock");
const { textToImage } = require("../src/lib/textToImage.js");
const s3 = require("../src/lib/uploadS3.js");

describe("textToImage", () => {
  const endpoint = "https://api.stability.ai";
  const token = "abc";

  beforeEach(() => {
    process.env.STABILITY_KEY = token;
    process.env.AWS_REGION = "us-east-1";
    process.env.S3_BUCKET = "bucket";
    process.env.CLOUDFRONT_DOMAIN = "cdn.test";
    process.env.AWS_ACCESS_KEY_ID = "test";
    process.env.AWS_SECRET_ACCESS_KEY = "secret";
    delete process.env.http_proxy;
    delete process.env.https_proxy;
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
    nock.disableNetConnect();
    s3.uploadFile.mockResolvedValue("https://cdn.test/image.png");
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
    jest.restoreAllMocks();
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
  });

  test("uploads generated image and returns url", async () => {
    const png = Buffer.from("png");
    nock(endpoint)
      .post("/v2beta/stable-image/generate/core")
      .reply(200, png, { "Content-Type": "image/png" });
    const url = await textToImage("hello");
    expect(url).toBe("https://cdn.test/image.png");
    expect(s3.uploadFile).toHaveBeenCalledWith(expect.any(String), "image/png");
  });
});
