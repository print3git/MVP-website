const axios = require('axios');
const templates = require('../ad_templates.json');

function pickTemplate() {
  return templates[Math.floor(Math.random() * templates.length)].template;
}

async function generateAdCopy(subreddit, context = '') {
  const apiUrl = process.env.LLM_API_URL;
  if (apiUrl) {
    try {
      const { data } = await axios.post(apiUrl, {
        prompt: `Write a short advert for r/${subreddit}. Context: ${context}`,
      });
      if (data && data.text) return data.text.trim();
    } catch (err) {
      console.error('LLM API failed', err.message);
    }
  }
  const tpl = pickTemplate();
  return tpl.replace('{subreddit}', subreddit);
}

module.exports = generateAdCopy;
