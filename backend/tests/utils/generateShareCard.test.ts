jest.mock("jimp", () => {
  const mJimp = jest.fn(() => ({ print: jest.fn(), writeAsync: jest.fn() }));
  mJimp.FONT_SANS_32_BLACK = "font";
  mJimp.loadFont = jest.fn(() => Promise.resolve("font"));
  return mJimp;
});
const Jimp = require("jimp");
const generateShareCard = require("../../utils/generateShareCard");

test("writes text to image and saves file", async () => {
  const instance = await generateShareCard(123, "/tmp/card.png");
  expect(Jimp).toHaveBeenCalledWith(600, 400, "#ffffff");
  expect(Jimp.loadFont).toHaveBeenCalledWith(Jimp.FONT_SANS_32_BLACK);
  const obj = (Jimp as jest.Mock).mock.results[0].value;
  expect(obj.print).toHaveBeenCalled();
  expect(obj.writeAsync).toHaveBeenCalledWith("/tmp/card.png");
});
