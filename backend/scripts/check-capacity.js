require("dotenv").config();
const { Client } = require("pg");
const { sendMail } = require("../mail");

const PRODUCT_HOURS = { single: 1, multi: 2, premium: 3 };
const THRESHOLD = parseFloat(process.env.CAPACITY_WARNING_THRESHOLD || "0.8");
const ALERT_EMAIL = process.env.CAPACITY_ALERT_EMAIL || "";

async function getDailyDemand(client) {
  const { rows } = await client.query(
    `SELECT product_type, SUM(quantity) AS qty
       FROM orders
      WHERE status='paid' AND created_at >= NOW() - INTERVAL '1 day'
      GROUP BY product_type`,
  );
  let hours = 0;
  for (const row of rows) {
    const perUnit = PRODUCT_HOURS[row.product_type] || 1;
    hours += (parseInt(row.qty, 10) || 0) * perUnit;
  }
  return hours;
}

async function getPrinterCapacity(client) {
  const res = await client.query("SELECT COUNT(*) FROM printers");
  const count = parseInt(res.rows[0].count, 10) || 0;
  return count * 24; // hours per day
}

async function checkCapacity() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const demand = await getDailyDemand(client);
    const capacity = await getPrinterCapacity(client);
    const ratio = capacity ? demand / capacity : 0;
    if (ratio > THRESHOLD && ALERT_EMAIL) {
      await sendMail(
        ALERT_EMAIL,
        "Capacity Warning",
        `Demand of ${demand}h is ${Math.round(ratio * 100)}% of daily capacity (${capacity}h)`,
      );
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  checkCapacity().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = checkCapacity;
