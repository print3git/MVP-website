require('dotenv').config();
const { Client } = require('pg');
const { sendTemplate } = require('../mail');

const DELAY_DAYS = parseInt(process.env.POST_PURCHASE_FOLLOWUP_DAYS || '5', 10);
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

async function sendPostPurchaseFollowups() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT o.session_id, o.job_id, u.email, u.username
       FROM orders o
       JOIN users u ON o.user_id=u.id
       WHERE o.status='paid'
         AND o.followup_sent=FALSE
         AND o.created_at < NOW() - INTERVAL '${DELAY_DAYS} days'`
    );
    for (const row of rows) {
      try {
        const reorderUrl = `${SITE_URL}/payment.html?reorder=${row.job_id}`;
        await sendTemplate(row.email, 'Thanks for your order', 'post_purchase_followup.txt', {
          username: row.username,
          reorder_url: reorderUrl,
        });
        await client.query('UPDATE orders SET followup_sent=TRUE WHERE session_id=$1', [
          row.session_id,
        ]);
      } catch (err) {
        console.error('Failed to send follow-up for', row.session_id, err);
      }
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  sendPostPurchaseFollowups();
}

module.exports = sendPostPurchaseFollowups;
