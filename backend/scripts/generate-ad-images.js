require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function generateAdImage(prompt, outFile) {
  const { data } = await axios.post(
    process.env.DIFFUSION_URL,
    { prompt },
    {
      headers: { Authorization: `Bearer ${process.env.DIFFUSION_TOKEN}` },
      responseType: 'arraybuffer',
    }
  );
  fs.writeFileSync(outFile, data);
  console.log('Saved image to', outFile);
}

if (require.main === module) {
  const subreddit = process.argv[2];
  if (!subreddit) {
    console.error('Usage: node generate-ad-images.js <subreddit>');
    process.exit(1);
  }
  const prompt = `Advertisement image for the r/${subreddit} community using a 3D printing theme`;
  const outPath = path.join(__dirname, '..', '..', 'uploads', `ad-${subreddit}.png`);
  generateAdImage(prompt, outPath).catch((err) => {
    console.error('Failed to generate image', err);
    process.exit(1);
  });
}

module.exports = generateAdImage;
