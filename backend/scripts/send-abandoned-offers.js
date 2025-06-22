require("dotenv").config();
const { Client } = require("pg");
const { sendTemplate } = require("../mail");
const { createTimedCode } = require("../discountCodes");

const DELAY_HOURS = parseInt(
  process.env.ABANDONED_OFFER_DELAY_HOURS || "24",
  10,
);

async function sendAbandonedOffers() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT session_id, shipping_info->>'email' AS email
         FROM orders
        WHERE status='pending'
          AND shipping_info ? 'email'
          AND COALESCE(abandoned_offer_sent, FALSE)=FALSE
          AND created_at < NOW() - INTERVAL '${DELAY_HOURS} hours'`,
    );
    for (const row of rows) {
      if (!row.email) continue;
      try {
        const code = await createTimedCode(500, 48);
        await sendTemplate(
          row.email,
          "Complete Your Purchase",
          "discount_offer.txt",
          { code },
        );
        await client.query(
          "UPDATE orders SET abandoned_offer_sent=TRUE WHERE session_id=$1",
          [row.session_id],
        );
      } catch (err) {
        console.error("Failed to send offer for", row.session_id, err);
      }
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  sendAbandonedOffers();
}

module.exports = sendAbandonedOffers;
