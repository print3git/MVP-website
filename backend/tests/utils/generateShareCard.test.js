const fs = require("fs");
const path = require("path");

jest.mock("jimp", () => {
  const mJimp = jest.fn(() => ({ print: jest.fn(), writeAsync: jest.fn() }));
  mJimp.FONT_SANS_32_BLACK = "FONT";
  mJimp.loadFont = jest.fn(() => Promise.resolve("FONT"));
  return mJimp;
});

const Jimp = require("jimp");

const generateShareCard = require("../../utils/generateShareCard");

describe("generateShareCard", () => {
  const tmpDir = fs.mkdtempSync(path.join(__dirname, "sharecard-"));
  const outPath = path.join(tmpDir, "card.png");

  const mImage = { print: jest.fn().mockReturnThis(), writeAsync: jest.fn() };

  beforeEach(() => {
    Jimp.mockClear();
    Jimp.loadFont.mockResolvedValue("FONT");
    Jimp.mockReturnValue(mImage);
    mImage.print.mockClear();
    mImage.writeAsync.mockClear();
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("creates image with model id", async () => {
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

  test("handles string id and write error", async () => {
    mImage.writeAsync.mockRejectedValue(new Error("disk full"));
    await expect(generateShareCard("abc", outPath)).rejects.toThrow(
      "disk full",
    );
  });
});
