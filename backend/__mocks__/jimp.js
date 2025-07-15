const mImage = { print: jest.fn().mockReturnThis(), writeAsync: jest.fn() };
const Jimp = jest.fn(() => mImage);
Jimp.loadFont = jest.fn();
Jimp.FONT_SANS_32_BLACK = "FONT_SANS_32_BLACK";
Jimp.__image = mImage;
module.exports = Jimp;
