require('dotenv').config();
const axios = require('axios');
const db = require('./db');

const API_URL = process.env.REDDIT_ADS_API_URL || '';
const API_TOKEN = process.env.REDDIT_ADS_API_TOKEN || '';
const PROFIT_PER_SALE = parseInt(process.env.PROFIT_PER_SALE_CENTS || '500', 10);

async function fetchCampaignPerformance() {
  if (!API_URL) return [];
  try {
    const res = await axios.get(`${API_URL}/performance`, {
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    });
    return res.data || [];
  } catch (err) {
    console.error('Failed to fetch campaign performance', err.message);
    return [];
  }
}

async function adjustBudgets(performance) {
  for (const camp of performance) {
    const { subreddit, campaign_id, spend_cents, budget_cents } = camp;
    const orders = await db.query(
      "SELECT COUNT(*) FROM orders WHERE subreddit=$1 AND status='paid' AND created_at>=NOW()-INTERVAL '7 days'",
      [subreddit]
    );
    const count = parseInt(orders.rows[0].count, 10);
    if (!count) continue;
    const cac = spend_cents / count;
    let action = null;
    let newBudget = budget_cents;
    if (cac > PROFIT_PER_SALE * 1.5) {
      // pause campaign
      action = 'pause';
      newBudget = 0;
      try {
        await axios.post(`${API_URL}/campaigns/${campaign_id}/pause`, null, {
          headers: { Authorization: `Bearer ${API_TOKEN}` },
        });
      } catch (err) {
        console.error('Failed to pause campaign', err.message);
      }
    } else if (cac > PROFIT_PER_SALE) {
      action = 'decrease';
      newBudget = Math.round(budget_cents * 0.8);
      try {
        await axios.post(
          `${API_URL}/campaigns/${campaign_id}/budget`,
          { budget_cents: newBudget },
          { headers: { Authorization: `Bearer ${API_TOKEN}` } }
        );
      } catch (err) {
        console.error('Failed to decrease budget', err.message);
      }
    } else if (cac < PROFIT_PER_SALE * 0.8) {
      action = 'increase';
      newBudget = Math.round(budget_cents * 1.1);
      try {
        await axios.post(
          `${API_URL}/campaigns/${campaign_id}/budget`,
          { budget_cents: newBudget },
          { headers: { Authorization: `Bearer ${API_TOKEN}` } }
        );
      } catch (err) {
        console.error('Failed to increase budget', err.message);
      }
    }
    if (action) {
      await db.insertScalingEvent(subreddit, budget_cents, newBudget, action);
    }
  }
}

async function runScalingEngine() {
  const perf = await fetchCampaignPerformance();
  await adjustBudgets(perf);
}

if (require.main === module) {
  runScalingEngine().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = runScalingEngine;
