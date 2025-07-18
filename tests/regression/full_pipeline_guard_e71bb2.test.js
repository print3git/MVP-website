const baseline = require("./baseline_output.json");

jest.mock("../../backend/src/lib/textToImage", () => ({
  textToImage: jest.fn(),
}));
jest.mock("../../backend/src/lib/imageToText", () => ({
  imageToText: jest.fn(),
}));
jest.mock("../../backend/src/lib/prepareImage", () => ({
  prepareImage: jest.fn(),
}));
jest.mock("../../backend/src/lib/sparc3dClient", () => ({
  generateGlb: jest.fn(),
}));
jest.mock("../../backend/src/lib/storeGlb", () => ({ storeGlb: jest.fn() }));

const textToImageMod = require("../../backend/src/lib/textToImage");
const imageToTextMod = require("../../backend/src/lib/imageToText");
const prepareImageMod = require("../../backend/src/lib/prepareImage");
const sparcMod = require("../../backend/src/lib/sparc3dClient");
const storeGlbMod = require("../../backend/src/lib/storeGlb");
const { generateModel } = require("../../backend/src/pipeline/generateModel");

describe("full pipeline regression guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STABILITY_KEY = baseline.tokens.STABILITY_KEY;
    process.env.SPARC3D_TOKEN = baseline.tokens.SPARC3D_TOKEN;
    process.env.IMAGE2TEXT_ENDPOINT = "http://img2txt";
    process.env.IMAGE2TEXT_KEY = "img2txt";
    process.env.AWS_REGION = "us-east-1";
    process.env.S3_BUCKET = "bucket";
    process.env.AWS_ACCESS_KEY_ID = "id";
    process.env.AWS_SECRET_ACCESS_KEY = "secret";

    textToImageMod.textToImage.mockResolvedValue("https://img");
    imageToTextMod.imageToText.mockResolvedValue("prompt");
    prepareImageMod.prepareImage.mockResolvedValue("https://img");
    sparcMod.generateGlb.mockResolvedValue(Buffer.from("glTFsampledata"));
    storeGlbMod.storeGlb.mockResolvedValue("https://cdn/model.glb");
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("pipeline output matches baseline", async () => {
    const start = Date.now();
    const url = await generateModel({ prompt: "guard test" });
    const elapsed = Date.now() - start;

    const calls = {
      textToImage: textToImageMod.textToImage.mock.calls.length,
      imageToText: imageToTextMod.imageToText.mock.calls.length,
      prepareImage: prepareImageMod.prepareImage.mock.calls.length,
      generateGlb: sparcMod.generateGlb.mock.calls.length,
      storeGlb: storeGlbMod.storeGlb.mock.calls.length,
    };

    expect(calls).toEqual(baseline.calls);
    const glb = storeGlbMod.storeGlb.mock.calls[0][0];
    expect(Buffer.isBuffer(glb)).toBe(true);
    expect(glb.length).toBeGreaterThanOrEqual(baseline.glbLength - 2);
    expect(glb.length).toBeLessThanOrEqual(baseline.glbLength + 2);
    expect(elapsed).toBeLessThan(baseline.maxProcessingTime);
    expect(process.env.STABILITY_KEY).toBe(baseline.tokens.STABILITY_KEY);
    expect(process.env.SPARC3D_TOKEN).toBe(baseline.tokens.SPARC3D_TOKEN);
    expect(url).toBe("https://cdn/model.glb");
  });
});
