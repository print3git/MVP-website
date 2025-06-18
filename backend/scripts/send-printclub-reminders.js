require('dotenv').config();
const { Client } = require('pg');
const { sendTemplate } = require('../mail');

function startOfWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay();
  const diff = date.getUTCDate() - day;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));
}

function daysUntilNextReset() {
  const today = new Date();
  const nextWeekStart = new Date(startOfWeek(today).getTime() + 7 * 24 * 60 * 60 * 1000);
  return Math.ceil((nextWeekStart - today) / (24 * 60 * 60 * 1000));
}

async function sendReminders() {
  if (daysUntilNextReset() > 2) return;

  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  const week = startOfWeek();
  const weekStr = week.toISOString().slice(0, 10);
  try {
    const { rows } = await client.query(
      `SELECT u.email, u.username

         FROM subscription_credits c
         JOIN subscriptions s ON c.user_id=s.user_id
         JOIN users u ON c.user_id=u.id
        WHERE s.status='active'
          AND c.week_start=$1
          AND c.total_credits - c.used_credits > 0`,

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
