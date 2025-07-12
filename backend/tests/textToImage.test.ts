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

const s3Module = require("../src/lib/uploadS3");

const nock = require("nock");
const { textToImage } = require("../src/lib/textToImage.js");
const mockUrl = "https://cdn.test/image.png";
let s3;

describe("textToImage", () => {
  const endpoint = "https://api.stability.ai";
  const token = "abc";

  beforeEach(() => {
    s3 = s3Module;
    jest
      .spyOn(s3, "uploadFile")
      .mockResolvedValue(mockUrl);
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
    jest
      .spyOn(s3, "uploadFile")
      .mockResolvedValue("https://cdn.test/image.png");
    expect(jest.isMockFunction(s3.uploadFile)).toBe(true);
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
    jest.clearAllMocks();
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
  });

  test("uploads generated image and returns url", async () => {
    const png = Buffer.from("png");
    nock(endpoint)
      .post("/v2beta/stable-image/generate/core")
      .reply(200, png, { "Content-Type": "image/png" });
    const url = await textToImage("hello");
    expect(url).toBe(mockUrl);
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
    expect(url).toBe(mockUrl);
    expect(s3.uploadFile).toHaveBeenCalledWith(expect.any(String), "image/png");
  });

  test("returns unique url with real uploadFile", async () => {
    jest.resetModules();
    jest.unmock("../src/lib/uploadS3");
    const s3Actual = require("../src/lib/uploadS3");
    jest.spyOn(s3Actual, "uploadFile");
    const {
      textToImage: textToImageActual,
    } = require("../src/lib/textToImage.js");
    const png = Buffer.from("png");
    nock(endpoint)
      .post("/v2beta/stable-image/generate/core")
      .reply(200, png, { "Content-Type": "image/png" });
    const url = await textToImageActual("unique");
    expect(url).toMatch(/^https:\/\/cdn\.test\/images\/\d+-.*\.png$/);
    expect(s3Actual.uploadFile).toHaveBeenCalledWith(
      expect.any(String),
      "image/png",
    );
  });
});
