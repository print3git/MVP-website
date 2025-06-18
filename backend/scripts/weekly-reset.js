require('dotenv').config();
const { Client } = require('pg');

function startOfWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay();
  const diff = date.getUTCDate() - day;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));
}


async function resetCredits() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  const week = startOfWeek();
  const weekStr = week.toISOString().slice(0, 10);
  try {
    await client.query(
      `INSERT INTO subscription_credits(user_id, week_start, total_credits)
       SELECT user_id, $1, 2 FROM subscriptions
       WHERE status='active'
       ON CONFLICT (user_id, week_start) DO NOTHING`,
      [weekStr]
    );

  } finally {
    await client.end();
  }
}

if (require.main === module) {
  resetCredits();
}

module.exports = resetCredits;
