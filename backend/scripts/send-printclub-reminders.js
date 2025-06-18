require('dotenv').config();
const { Client } = require('pg');
const { sendTemplate } = require('../mail');

function startOfWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay();
  const diff = date.getUTCDate() - day;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));
}

async function sendReminders() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const week = startOfWeek();
    const weekStr = week.toISOString().slice(0, 10);
    const { rows } = await client.query(
      `SELECT u.email, u.username
         FROM subscription_credits sc
         JOIN subscriptions s ON sc.user_id=s.user_id
         JOIN users u ON s.user_id=u.id
        WHERE sc.week_start=$1 AND sc.total_credits>sc.used_credits AND s.status='active'`,
      [weekStr]
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
