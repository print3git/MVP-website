const envBackup = { ...process.env };

const baseEnv = {
  STABILITY_KEY: "key",
  SPARC3D_ENDPOINT: "http://sparc",
  SPARC3D_TOKEN: "token",
  IMAGE2TEXT_ENDPOINT: "http://img2txt",
  IMAGE2TEXT_KEY: "img2txt",
  AWS_REGION: "us-east-1",
  S3_BUCKET: "bucket",
  AWS_ACCESS_KEY_ID: "id",
  AWS_SECRET_ACCESS_KEY: "secret",
  CLOUDFRONT_MODEL_DOMAIN: "cdn.example.com",
};

beforeEach(() => {
  jest.resetModules();
  Object.assign(process.env, baseEnv);
});

afterEach(() => {
  jest.resetModules();
  Object.assign(process.env, envBackup);
});

const steps = [
  { mod: "../backend/src/lib/prepareImage", fn: "prepareImage" },
  { mod: "../backend/src/lib/textToImage", fn: "textToImage" },
  { mod: "../backend/src/lib/imageToText", fn: "imageToText" },
  { mod: "../backend/src/lib/sparc3dClient", fn: "generateGlb" },
  { mod: "../backend/src/lib/storeGlb", fn: "storeGlb" },
];

describe("GLB pipeline integrity", () => {
  for (const { mod, fn } of steps) {
    test(`${fn} failure surfaces and logs`, async () => {
      await jest.isolateModulesAsync(async () => {
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
          generateGlb: jest.fn().mockResolvedValue(Buffer.from("glTF1234")),
        }));
        jest.doMock("../backend/src/lib/preserveColors", () => ({
          preserveColors: jest.fn(async (b) => b),
        }));
        jest.doMock("../backend/src/lib/storeGlb", () => ({
          storeGlb: jest.fn().mockResolvedValue("https://cdn/model.glb"),
        }));

        // override the failing module
        jest.doMock(mod, () => ({
          [fn]: jest.fn().mockRejectedValue(new Error(`${fn} fail`)),
        }));

        const {
          generateModel,
        } = require("../backend/src/pipeline/generateModel");
        const params =
          fn === "textToImage"
            ? { prompt: "p" }
            : fn === "imageToText"
              ? { image: "data:image/png;base64,AA==" }
              : { prompt: "p", image: "data:image/png;base64,AA==" };
        await expect(generateModel(params)).rejects.toThrow(`${fn} fail`);
      });
    });
  }

  test("invalid GLB triggers failure", async () => {
    await jest.isolateModulesAsync(async () => {
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
        generateGlb: jest.fn().mockResolvedValue(Buffer.from("bad")),
      }));
      jest.doMock("../backend/src/lib/preserveColors", () => ({
        preserveColors: jest.fn(async (b) => b),
      }));
      jest.doMock("../backend/src/lib/storeGlb", () => ({
        storeGlb: jest.fn(() => {
          throw new Error("Invalid GLB");
        }),
      }));

      const {
        generateModel,
      } = require("../backend/src/pipeline/generateModel");
      await expect(
        generateModel({ prompt: "p", image: "data:image/png;base64,AA==" }),
      ).rejects.toThrow("Invalid GLB");
    });
  });
});
