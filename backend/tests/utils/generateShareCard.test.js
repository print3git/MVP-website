jest.mock("jimp", () => {
  const image = { print: jest.fn(), writeAsync: jest.fn() };
  const mockJimp = jest.fn(() => image);
  mockJimp.__image = image;
  mockJimp.loadFont = jest.fn();
  mockJimp.FONT_SANS_32_BLACK = "FONT_SANS_32_BLACK";
  mockJimp.mockReset = () => {
    mockJimp.mockClear();
    image.print.mockReset();
    image.writeAsync.mockReset();
  };
  return mockJimp;
});

const Jimp = require("jimp");
const fs = require("fs");
const path = require("path");

const generateShareCard = require("../../utils/generateShareCard");

describe("generateShareCard", () => {
  const tmpDir = fs.mkdtempSync(path.join(__dirname, "sharecard-"));
  const outPath = path.join(tmpDir, "card.png");

  const mImage = Jimp.__image;

  beforeEach(() => {
    Jimp.mockReset();
    Jimp.loadFont.mockResolvedValue("FONT");
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
