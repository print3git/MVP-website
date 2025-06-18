require('dotenv').config();
const axios = require('axios');
const { dalleServerUrl } = require('../config');

async function generateAdImage(prompt) {
  const { data } = await axios.post(`${dalleServerUrl}/generate`, { prompt });
  return data.image;
}

if (require.main === module) {
  const prompt = process.argv.slice(2).join(' ');
  if (!prompt) {
    console.error('Usage: node generate-ad-image.js <prompt>');
    process.exit(1);
  }
  generateAdImage(prompt)
    .then((img) => console.log(img))
    .catch((err) => {
      console.error('Failed to generate image', err);
      process.exit(1);
    });
}

module.exports = generateAdImage;
