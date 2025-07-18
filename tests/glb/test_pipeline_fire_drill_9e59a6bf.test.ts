import logger from "../../src/logger";

jest.mock("../../backend/src/lib/prepareImage", () => ({
  prepareImage: jest.fn().mockResolvedValue("http://img"),
}));

jest.mock("../../backend/src/lib/textToImage", () => ({
  textToImage: jest.fn().mockResolvedValue("http://img"),
}));

jest.mock("../../backend/src/lib/imageToText", () => ({
  imageToText: jest.fn().mockResolvedValue("prompt"),
}));

jest.mock("../../backend/src/lib/sparc3dClient", () => ({
  generateGlb: jest.fn().mockResolvedValue(Buffer.from("bad")),
}));

jest.mock("../../backend/src/lib/preserveColors", () => ({
  preserveColors: jest.fn(async (b) => b),
}));

jest.mock("../../backend/src/lib/storeGlb", () => ({
  storeGlb: jest.fn(() => {
    throw new Error("Invalid GLB");
  }),
}));

const { generateModel } = require("../../backend/src/pipeline/generateModel");

describe("pipeline fire drill", () => {
  test("handles malformed GLB without false success", async () => {
    const errSpy = jest.spyOn(logger, "error").mockImplementation(() => {});
    await expect(
      generateModel({ prompt: "p", image: "data:image/png;base64,AA==" }),
    ).rejects.toThrow("Invalid GLB");
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
