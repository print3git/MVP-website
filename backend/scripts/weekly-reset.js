require('dotenv').config();
const { Client } = require('pg');

async function resetCredits() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const day = start.getUTCDay();
    start.setUTCDate(start.getUTCDate() - day);
    const weekStr = start.toISOString().slice(0, 10);
    const { rows } = await client.query("SELECT user_id FROM subscriptions WHERE status='active'");
    for (const row of rows) {
      await client.query(
        `INSERT INTO subscription_credits(user_id, week_start, total_credits, used_credits)
         VALUES($1,$2,2,0)
         ON CONFLICT (user_id, week_start)
         DO UPDATE SET total_credits=EXCLUDED.total_credits, used_credits=0`,
        [row.user_id, weekStr]
      );
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  resetCredits().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = resetCredits;
