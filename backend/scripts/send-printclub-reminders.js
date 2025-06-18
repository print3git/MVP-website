require('dotenv').config();
const { Client } = require('pg');
const { sendTemplate } = require('../mail');

function startOfWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay();
  const diff = date.getUTCDate() - day;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));
}
async function sendReminders(now = new Date()) {
  if (now.getUTCDay() !== 6) return; // only send on Saturday
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const week = startOfWeek(now);
    const weekStr = week.toISOString().slice(0, 10);
    const { rows } = await client.query(
      `SELECT u.email, u.username
         FROM subscriptions s
         JOIN users u ON s.user_id=u.id
         JOIN subscription_credits c ON c.user_id=s.user_id AND c.week_start=$1
        WHERE s.status='active' AND c.total_credits - c.used_credits > 0`,
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
