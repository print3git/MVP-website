require('dotenv').config();
const { Client } = require('pg');
const { sendTemplate } = require('../mail');

async function sendReminders() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT u.email, u.username
         FROM subscriptions s
         JOIN users u ON s.user_id=u.id
        WHERE s.status='active'`
    );
    for (const row of rows) {
      try {
        await sendTemplate(row.email, 'Print Club Reminder', 'reminder.txt', {
          username: row.username,
        });
      } catch (err) {
        console.error('Failed to send reminder to', row.email, err);
      }
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  sendReminders();
}

module.exports = sendReminders;
