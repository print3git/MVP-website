require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function generateAdCopy(subreddit) {
  const templatesPath = path.join(__dirname, '..', 'ad_templates.json');
  const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
  const template = templates[Math.floor(Math.random() * templates.length)];
  const prompt = template.replace(/\{subreddit\}/g, subreddit);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY required');
  const { data } = await axios.post(
    'https://api.openai.com/v1/completions',
    { model: 'text-davinci-003', prompt, max_tokens: 32 },
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
  return data.choices[0].text.trim();
}

if (require.main === module) {
  const [subreddit] = process.argv.slice(2);
  if (!subreddit) {
    console.error('Usage: node generate-ad-copy.js <subreddit>');
    process.exit(1);
  }
  generateAdCopy(subreddit)
    .then((text) => console.log(text))
    .catch((err) => {
      console.error('Failed to generate ad copy', err);
      process.exit(1);
    });
}

module.exports = generateAdCopy;
