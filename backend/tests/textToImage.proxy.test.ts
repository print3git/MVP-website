const nock = require("nock");
let s3;

process.env.http_proxy = "http://proxy:8080";
process.env.https_proxy = "http://proxy:8080";
process.env.HTTP_PROXY = "http://proxy:8080";
process.env.HTTPS_PROXY = "http://proxy:8080";

delete process.env.http_proxy;
delete process.env.https_proxy;
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;

const { textToImage } = require("../src/lib/textToImage.js");

describe("textToImage proxy cleanup", () => {
  beforeEach(() => {
    s3 = require("../src/lib/uploadS3");
    jest
      .spyOn(s3, "uploadFile")
      .mockResolvedValue("https://cdn.test/image.png");
    process.env.STABILITY_KEY = "abc";
    process.env.AWS_REGION = "us-east-1";
    process.env.S3_BUCKET = "bucket";
    process.env.CLOUDFRONT_DOMAIN = "cdn.test";
    nock.disableNetConnect();
    expect(jest.isMockFunction(s3.uploadFile)).toBe(true);
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
    jest.clearAllMocks();
  });

  test("uses nock endpoint even when proxy env was set", async () => {
    const png = Buffer.from("png");
    nock("https://api.stability.ai")
      .post("/v2beta/stable-image/generate/core")
      .reply(200, png, { "Content-Type": "image/png" });

    const url = await textToImage("hello");
    expect(url).toBe("https://cdn.test/image.png");
    expect(s3.uploadFile).toHaveBeenCalledTimes(1);
    expect(nock.isDone()).toBe(true);
  });

  test("works without AWS credentials when uploadFile is mocked", async () => {
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    const png = Buffer.from("png");
    nock("https://api.stability.ai")
      .post("/v2beta/stable-image/generate/core")
      .reply(200, png, { "Content-Type": "image/png" });
    const url = await textToImage("no-creds");
    expect(url).toBe("https://cdn.test/image.png");
    expect(s3.uploadFile).toHaveBeenCalledTimes(1);
    expect(nock.isDone()).toBe(true);
  });
});
