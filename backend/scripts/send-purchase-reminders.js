require('dotenv').config();
const { Client } = require('pg');
const { sendMail } = require('../mail');

const DELAY_HOURS = parseInt(process.env.PURCHASE_REMINDER_DELAY_HOURS || '24', 10);

async function sendPurchaseReminders() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT j.job_id, u.email
       FROM jobs j
       JOIN users u ON j.user_id=u.id
       LEFT JOIN orders o ON j.job_id=o.job_id
       WHERE j.status='complete'
         AND o.job_id IS NULL
         AND j.reminder_sent=FALSE
         AND j.created_at < NOW() - INTERVAL '${DELAY_HOURS} hours'`
    );
    for (const row of rows) {
      try {
        await sendMail(
          row.email,
          'Complete Your Purchase',
          'You generated a model but never purchased a print. Act now!'
        );
        await client.query('UPDATE jobs SET reminder_sent=TRUE WHERE job_id=$1', [row.job_id]);
      } catch (err) {
        console.error('Failed to send reminder for', row.job_id, err);
      }
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  sendPurchaseReminders();
}

module.exports = sendPurchaseReminders;
