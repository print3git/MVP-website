require('dotenv').config();
const axios = require('axios');
const { Client } = require('pg');
const db = require('../db');

async function fetchStats() {
  const client = new Client();
  await client.connect();
  try {
    const tokenRes = await axios.post(
      'https://www.reddit.com/api/v1/access_token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: process.env.REDDIT_REFRESH_TOKEN,
      }).toString(),
      {
        auth: {
          username: process.env.REDDIT_APP_ID,
          password: process.env.REDDIT_SECRET,
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );
    const accessToken = tokenRes.data.access_token;
    const report = await axios.get(process.env.REDDIT_ADS_REPORT_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const rows = report.data.data || [];
    for (const r of rows) {
      const spendCents = Math.round(parseFloat(r.spend) * 100);
      await db.upsertAdStat(r.date, r.subreddit, r.impressions, spendCents);
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  fetchStats().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = fetchStats;
