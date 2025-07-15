jest.mock("jimp", () => {
  const fn = jest.fn();
  return {
    __esModule: true,
    default: fn,
    loadFont: jest.fn(),
    FONT_SANS_32_BLACK: "FONT_SANS_32_BLACK",
  };
});
const Jimp = require("jimp").default;
const fs = require("fs");
const path = require("path");

const generateShareCard = require("../../utils/generateShareCard");

describe("generateShareCard", () => {
  const tmpDir = fs.mkdtempSync(path.join(__dirname, "sharecard-"));
  const outPath = path.join(tmpDir, "card.png");

  const mImage = { print: jest.fn().mockReturnThis(), writeAsync: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    Jimp.loadFont.mockResolvedValue("FONT");
    Jimp.mockImplementation(() => mImage);
    mImage.print.mockClear();
    mImage.writeAsync.mockClear();
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test.skip("creates image with model id", async () => {
    await generateShareCard(123, outPath);
    expect(Jimp).toHaveBeenCalledWith(600, 400, "#ffffff");
    expect(Jimp.loadFont).toHaveBeenCalledWith(Jimp.FONT_SANS_32_BLACK);
    expect(mImage.print).toHaveBeenCalledWith(
      "FONT",
      20,
      20,
      "Gifted Model 123",
    );
    expect(mImage.writeAsync).toHaveBeenCalledWith(outPath);
  });

  test.skip("handles string id and write error", async () => {
    mImage.writeAsync.mockRejectedValue(new Error("disk full"));
    await expect(generateShareCard("abc", outPath)).rejects.toThrow(
      "disk full",
    );
  });
});
