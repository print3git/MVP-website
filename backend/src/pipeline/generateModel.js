const { textToImage } = require("../lib/textToImage");
const { imageToText } = require("../lib/imageToText");
const { prepareImage } = require("../lib/prepareImage");
const { generateGlb } = require("../lib/sparc3dClient");
const { storeGlb } = require("../lib/storeGlb");

async function generateModel({ prompt, image } = {}) {
  console.log(
    "🔸 generateModel called with prompt:",
    prompt,
    "image?",
    !!image,
  );
  console.time("pipeline");
  try {
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
    console.log("🔸 generateModel returning:", url);
    return url;
  } catch (err) {
    console.error("🚨 generateModel failed:", err);
    throw err;
  } finally {
    console.timeEnd("pipeline");
  }
}

module.exports = { generateModel };
