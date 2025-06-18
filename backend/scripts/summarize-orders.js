require('dotenv').config();
const { Client } = require('pg');
const db = require('../db');

const PRODUCT_HOURS = {
  single: 1,
  multi: 2,
  premium: 3,
};

function getYesterdayRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

async function summarize() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  const { start, end } = getYesterdayRange();
  try {
    const res = await client.query(
      `SELECT shipping_info->>'state' AS state, product_type, SUM(quantity) AS qty
         FROM orders
        WHERE status='paid' AND created_at>= $1 AND created_at < $2
        GROUP BY state, product_type`,
      [start, end]
    );

    const map = {};
    for (const row of res.rows) {
      const state = row.state || 'unknown';
      const qty = parseInt(row.qty, 10) || 0;
      const hours = PRODUCT_HOURS[row.product_type] || 1;
      if (!map[state]) map[state] = { count: 0, hours: 0 };
      map[state].count += qty;
      map[state].hours += qty * hours;
    }

    for (const state of Object.keys(map)) {
      await db.upsertOrderLocationSummary(start, state, map[state].count, map[state].hours);
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  summarize().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = summarize;
