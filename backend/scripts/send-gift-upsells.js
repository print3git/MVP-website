require("dotenv").config();
const { Client } = require("pg");
const { sendTemplate } = require("../mail");

const DELAY_DAYS = parseInt(process.env.GIFT_UPSELL_DAYS || "30", 10);

async function run() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, recipient_email
         FROM gifts
        WHERE claimed_at IS NOT NULL
          AND upsell_email_sent=FALSE
          AND claimed_at < NOW() - INTERVAL '${DELAY_DAYS} days'`,
    );
    for (const row of rows) {
      try {
        await sendTemplate(
          row.recipient_email,
          "Send a gift back",
          "gift_upsell.txt",
        );
        await client.query(
          "UPDATE gifts SET upsell_email_sent=TRUE WHERE id=$1",
          [row.id],
        );
      } catch (err) {
        console.error("Failed to send upsell for gift", row.id, err);
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
