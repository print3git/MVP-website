const { textToImage } = require("../lib/textToImage");
const { imageToText } = require("../lib/imageToText");
const { prepareImage } = require("../lib/prepareImage");
const { generateGlb } = require("../lib/sparc3dClient");
const { storeGlb } = require("../lib/storeGlb");

async function generateModel({ prompt, image } = {}) {
  console.time("pipeline");
  let imageURL = image ? await prepareImage(image) : undefined;
  if (!prompt && imageURL) {
    prompt = await imageToText(imageURL);
  }
  if (!imageURL && prompt) {
    imageURL = await textToImage(prompt);
  }
  if (!prompt || !imageURL) {
    throw new Error("prompt or image required");
  }
  const glbData = await generateGlb({ prompt, imageURL });
  const url = await storeGlb(glbData);
  console.timeEnd("pipeline");
  return url;
}

module.exports = { generateModel };
