require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');

async function generateAds(subreddit) {
  const templatesPath = path.join(__dirname, '..', 'ads', 'templates.json');
  const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8')).textPatterns;
  const prompt = `Create three short Reddit ads for the r/${subreddit} community using these patterns:\n${templates.join('\n')}`;

  const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));
  const res = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
  });
  return res.data.choices[0].message.content.trim();
}

if (require.main === module) {
  const subreddit = process.argv[2];
  if (!subreddit) {
    console.error('Usage: node generate-ads.js <subreddit>');
    process.exit(1);
  }
  generateAds(subreddit)
    .then((text) => {
      console.log(text);
    })
    .catch((err) => {
      console.error('Failed to generate ads', err);
      process.exit(1);
    });
}

module.exports = generateAds;
