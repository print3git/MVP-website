const Jimp = require("jimp");

/**
 * Create a simple share card image for a given model.
 *
 * @param {string|number} modelId - Identifier for the model.
 * @param {string} outPath - Path where the image should be written.
 * @returns {Promise<void>} Resolves when the image has been written.
 */
async function generateShareCard(modelId, outPath) {
  const image = new Jimp(600, 400, "#ffffff");
  const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
  image.print(font, 20, 20, `Gifted Model ${modelId}`);
  await image.writeAsync(outPath);
}

module.exports = generateShareCard;
