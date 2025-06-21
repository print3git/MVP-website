const axios = require("axios");
const templates = require("../ad_templates.json");

/**
 * Randomly pick an advertisement template.
 *
 * @returns {string} Template string with placeholder tokens.
 */
function pickTemplate() {
  return templates[Math.floor(Math.random() * templates.length)].template;
}

/**
 * Generate ad copy for a subreddit.
 *
 * @param {string} subreddit - Subreddit to advertise.
 * @param {string} [context=''] - Optional context for the ad.
 * @returns {Promise<string>} Generated advertisement text.
 */
async function generateAdCopy(subreddit, context = "") {
  const apiUrl = process.env.LLM_API_URL;
  if (apiUrl) {
    try {
      const { data } = await axios.post(apiUrl, {
        prompt: `Write a short advert for r/${subreddit}. Context: ${context}`,
      });
      if (data && data.text) return data.text.trim();
    } catch (err) {
      console.error("LLM API failed", err.message);
    }
  }
  const tpl = pickTemplate();
  return tpl.replace("{subreddit}", subreddit);
}

module.exports = generateAdCopy;
