require("dotenv").config();
const { Client } = require("pg");
const { sendTemplate } = require("../mail");

async function sendGiftClaimReminders() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT g.id, g.recipient_email, g.claim_token
         FROM gifts g
        WHERE g.claimed_at IS NULL
          AND g.reminder_sent=FALSE
          AND g.created_at < NOW() - INTERVAL '7 days'`,
    );
    for (const row of rows) {
      try {
        const link = `${process.env.SITE_URL || "http://localhost:3000"}/claim-gift/${row.claim_token}`;
        await sendTemplate(
          row.recipient_email,
          "Claim your 3D Print",
          "gift_claim_reminder.txt",
          { link },
        );
        await client.query("UPDATE gifts SET reminder_sent=TRUE WHERE id=$1", [
          row.id,
        ]);
      } catch (err) {
        console.error("Failed to send reminder for gift", row.id, err);
      }
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  sendGiftClaimReminders();
}

module.exports = sendGiftClaimReminders;
