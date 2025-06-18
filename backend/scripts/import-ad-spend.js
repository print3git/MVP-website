require('dotenv').config();
const db = require('../db');
const { fetchCampaignPerformance } = require('../scalingEngine');

async function importAdSpend(date = new Date().toISOString().slice(0, 10)) {
  const performance = await fetchCampaignPerformance();
  for (const { subreddit, spend_cents } of performance) {
    await db.insertAdSpend(subreddit, date, spend_cents);
  }
  console.log(`Imported spend for ${performance.length} campaigns`);
}

if (require.main === module) {
  importAdSpend().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = importAdSpend;
