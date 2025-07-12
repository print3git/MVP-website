jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: jest.fn(),
}));

process.env.http_proxy = "http://proxy:8080";
process.env.https_proxy = "http://proxy:8080";
process.env.HTTP_PROXY = "http://proxy:8080";
process.env.HTTPS_PROXY = "http://proxy:8080";

delete process.env.http_proxy;
delete process.env.https_proxy;
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;

jest.mock("../src/lib/uploadS3.js", () => ({
  uploadFile: jest.fn().mockResolvedValue("https://cdn.test/image.png"),
}));

const nock = require("nock");
const s3 = require("../src/lib/uploadS3.js");
const { textToImage } = require("../src/lib/textToImage.js");

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

  test("works without AWS credentials when uploadFile is mocked", async () => {
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    const png = Buffer.from("png");
    nock(endpoint)
      .post("/v2beta/stable-image/generate/core")
      .reply(200, png, { "Content-Type": "image/png" });
    const url = await textToImage("hello again");
    expect(url).toBe("https://cdn.test/image.png");
    expect(s3.uploadFile).toHaveBeenCalledWith(expect.any(String), "image/png");
  });
});
