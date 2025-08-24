"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o)
            if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const nock_1 = __importDefault(require("nock"));
const textToImage_1 = require("../src/lib/textToImage");
const s3 = __importStar(require("../src/lib/uploadS3"));
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
    nock_1.default.disableNetConnect();
    jest
      .spyOn(s3, "uploadFile")
      .mockResolvedValue("https://cdn.test/image.png");
  });
  afterEach(() => {
    nock_1.default.cleanAll();
    nock_1.default.enableNetConnect();
    jest.restoreAllMocks();
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
  });
  test("uploads generated image and returns url", async () => {
    const png = Buffer.from("png");
    (0, nock_1.default)(endpoint)
      .post("/v2beta/stable-image/generate/core")
      .reply(200, png, { "Content-Type": "image/png" });
    const url = await (0, textToImage_1.textToImage)("hello");
    expect(url).toBe("https://cdn.test/image.png");
    expect(s3.uploadFile).toHaveBeenCalledWith(expect.any(String), "image/png");
  });
  test("works without AWS credentials when uploadFile is mocked", async () => {
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    const png = Buffer.from("png");
    (0, nock_1.default)(endpoint)
      .post("/v2beta/stable-image/generate/core")
      .reply(200, png, { "Content-Type": "image/png" });
    const url = await (0, textToImage_1.textToImage)("hello again");
    expect(url).toBe("https://cdn.test/image.png");
    expect(s3.uploadFile).toHaveBeenCalledWith(expect.any(String), "image/png");
  });
  test("returns unique url with real uploadFile", async () => {
    jest.resetModules();
    jest.unmock("../src/lib/uploadS3");
    const s3Actual = require("../src/lib/uploadS3");
    jest
      .spyOn(s3Actual, "uploadFile")
      .mockResolvedValue("https://cdn.test/image.png");
    const {
      textToImage: textToImageActual,
    } = require("../src/lib/textToImage.js");
    const png = Buffer.from("png");
    (0, nock_1.default)(endpoint)
      .post("/v2beta/stable-image/generate/core")
      .reply(200, png, { "Content-Type": "image/png" });
    const url = await textToImageActual("unique");
    expect(url).toBe("https://cdn.test/image.png");
    expect(s3Actual.uploadFile).toHaveBeenCalledWith(
      expect.any(String),
      "image/png",
    );
  });
});
