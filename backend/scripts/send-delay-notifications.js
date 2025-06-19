require('dotenv').config();
const { Client } = require('pg');
const { sendTemplate } = require('../mail');

const DELAY_DAYS = parseInt(process.env.ORDER_DELAY_DAYS || '7', 10);

async function run() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT o.session_id, u.email, u.username
         FROM orders o
         JOIN users u ON o.user_id=u.id
        WHERE o.status='paid'
          AND o.delay_notified=FALSE
          AND o.created_at < NOW() - INTERVAL '${DELAY_DAYS} days'`
    );
    for (const row of rows) {
      try {
        await sendTemplate(row.email, 'Order Update', 'order_delay.txt', {
          username: row.username,
          order_id: row.session_id,
        });
        await client.query(
          'UPDATE orders SET delay_notified=TRUE WHERE session_id=$1',
          [row.session_id]
        );
      } catch (err) {
        console.error('Failed to send delay notice for', row.session_id, err);
      }
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  run();
}

module.exports = run;
