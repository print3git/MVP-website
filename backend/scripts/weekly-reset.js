require('dotenv').config();
const { Client } = require('pg');
const db = require('../db');

async function resetCredits() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const { rows } = await client.query("SELECT user_id FROM subscriptions WHERE status='active'");
    for (const row of rows) {
      await db.ensureCurrentWeekCredits(row.user_id, 2);
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  resetCredits();
}

module.exports = resetCredits;
