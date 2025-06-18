require('dotenv').config();
const { Client } = require('pg');
const { sendMail } = require('../mail');

const HOURS_PER_ORDER = parseFloat(process.env.PRINTER_HOURS_PER_ORDER || '2');
const DAILY_CAPACITY = parseFloat(process.env.DAILY_CAPACITY_HOURS || '24');
const ALERT_EMAIL = process.env.CAPACITY_ALERT_EMAIL || '';

async function summarizeOrders() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT DATE(created_at) AS day,
              COALESCE(shipping_info->>'country', 'Unknown') AS location,
              COUNT(*)::int AS order_count
         FROM orders
        WHERE created_at >= NOW() - INTERVAL '1 day'
        GROUP BY day, location`
    );
    for (const row of rows) {
      const hours = row.order_count * HOURS_PER_ORDER;
      await client.query(
        `INSERT INTO order_summaries(day, location, order_count, printer_hours)
         VALUES($1,$2,$3,$4)
         ON CONFLICT (day, location)
         DO UPDATE SET order_count=$3, printer_hours=$4`,
        [row.day, row.location, row.order_count, hours]
      );
      if (hours > DAILY_CAPACITY && ALERT_EMAIL) {
        await sendMail(
          ALERT_EMAIL,
          'Capacity at risk',
          `Orders for ${row.location} on ${row.day} require ${hours} printer hours but capacity is ${DAILY_CAPACITY}.`
        );
      }
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  summarizeOrders();
}

module.exports = summarizeOrders;
