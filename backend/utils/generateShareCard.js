const Jimp = require("jimp");

async function generateShareCard(modelId, outPath) {
  const image = new Jimp(600, 400, "#ffffff");
  const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
  image.print(font, 20, 20, `Gifted Model ${modelId}`);
  await image.writeAsync(outPath);
}

module.exports = generateShareCard;
