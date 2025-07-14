const nock = require("nock");
const axios = require("axios");

jest.mock("../src/lib/uploadS3", () => ({
  uploadFile: jest.fn().mockResolvedValue("https://cdn.test/image.png"),
}));

const { textToImage } = require("../src/lib/textToImage.ts");

const endpoint = "https://api.stability.ai";

describe("textToImage edge cases", () => {
  beforeEach(() => {
    process.env.STABILITY_KEY = "abc";
    process.env.AWS_REGION = "us-east-1";
    process.env.S3_BUCKET = "bucket";
    process.env.CLOUDFRONT_DOMAIN = "cdn.test";
    jest.spyOn(require("fs"), "unlink").mockImplementation((_, cb) => cb && cb());
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
    jest.clearAllMocks();
  });

  test("empty prompt throws validation error", async () => {
    nock(endpoint)
      .post("/v2beta/stable-image/generate/core")
      .reply(400, { error: "prompt required" });

    await expect(textToImage(""))
      .rejects.toThrow("status 400");
  });

  test("invalid API key throws error", async () => {
    nock(endpoint)
      .post("/v2beta/stable-image/generate/core")
      .reply(401, { error: "Invalid API key" });

    await expect(textToImage("hello"))
      .rejects.toThrow("status 401");
  });

  test("malformed JSON results in parsing error", async () => {
    const err = new SyntaxError("Unexpected token < in JSON");
    jest.spyOn(axios, "post").mockRejectedValueOnce(err);

    await expect(textToImage("oops"))
      .rejects.toThrow("Unexpected token < in JSON");
  });

  test("successful buffer has correct content type", async () => {
    const png = Buffer.from("png");
    const scope = nock(endpoint)
      .post("/v2beta/stable-image/generate/core")
      .reply(200, png, { "Content-Type": "image/png" });

    await textToImage("good");
    expect(Buffer.isBuffer(png)).toBe(true);
    expect(scope.isDone()).toBe(true);
    const s3 = require("../src/lib/uploadS3");
    expect(s3.uploadFile).toHaveBeenCalledWith(expect.any(String), "image/png");
  });
});
