const Transport = require("winston-transport");
let logger = require("../src/logger");

class MemoryTransport extends Transport {
  constructor() {
    super();
    this.logs = [];
  }
  log(info, callback) {
    this.logs.push(typeof info === "string" ? info : JSON.stringify(info));
    callback();
  }
}

describe("glb pipeline telemetry", () => {
  const envBackup = { ...process.env };
  let memory;

  beforeEach(() => {
    jest.resetModules();
    Object.assign(process.env, {
      NODE_ENV: "development",
      LOG_LEVEL: "info",
      STABILITY_KEY: "key",
      SPARC3D_ENDPOINT: "http://sparc",
      SPARC3D_TOKEN: "token",
      AWS_REGION: "us-east-1",
      S3_BUCKET: "bucket",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      CLOUDFRONT_MODEL_DOMAIN: "cdn.example.com",
    });
    logger = require("../src/logger");
    memory = new MemoryTransport();
    logger.add(memory);
  });

  afterEach(() => {
    logger.remove(memory);
    jest.restoreAllMocks();
    jest.resetModules();
    Object.assign(process.env, envBackup);
  });

  test("logs prompt, api call, upload key and final url", async () => {
    jest.doMock("../backend/src/lib/prepareImage", () => ({
      prepareImage: jest.fn().mockResolvedValue("http://img"),
    }));
    jest.doMock("../backend/src/lib/textToImage", () => ({
      textToImage: jest.fn().mockResolvedValue("http://img"),
    }));
    jest.doMock("../backend/src/lib/imageToText", () => ({
      imageToText: jest.fn().mockResolvedValue("prompt"),
    }));
    jest.doMock("../backend/src/lib/sparc3dClient", () => ({
      generateGlb: jest.fn(async (opts) => {
        logger.info(`sparc3d POST ${JSON.stringify(opts)}`);
        return Buffer.from("glTF1234");
      }),
    }));
    jest.doMock("../backend/src/lib/preserveColors", () => ({
      preserveColors: jest.fn(async (b) => b),
    }));
    jest.doMock("../backend/src/lib/storeGlb", () => ({
      storeGlb: jest.fn(async () => {
        const key = "models/test.glb";
        logger.info(`upload key ${key}`);
        return `https://bucket.s3.us-east-1.amazonaws.com/${key}`;
      }),
    }));

    const { generateModel } = require("../backend/src/pipeline/generateModel");
    const url = await generateModel({ prompt: "hello" });

    const logs = memory.logs.join("\n");
    expect(logs).toContain("generateModel called with prompt");
    expect(logs).toContain("sparc3d POST");
    expect(logs).toContain("upload key models/test.glb");
    expect(logs).toContain("generateModel returning");
    expect(url).toContain("models/test.glb");
  });
});
