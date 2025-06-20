require("dotenv").config();
const { Client } = require("pg");
const { sendTemplate } = require("../mail");
const { getTrackingUrl } = require("../shipping");

async function run() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT o.session_id, o.tracking_number, o.carrier, u.email, u.username
       FROM orders o
       JOIN users u ON o.user_id=u.id
      WHERE o.status='paid'
        AND o.tracking_number IS NOT NULL
        AND (o.shipping_email_sent=FALSE OR o.shipping_email_sent IS NULL)`,
    );
    for (const row of rows) {
      try {
        const url = getTrackingUrl(row.carrier || "", row.tracking_number);
        await sendTemplate(
          row.email,
          "Your order has shipped",
          "shipping_confirmation.txt",
          {
            username: row.username,
            order_id: row.session_id,
            tracking_url: url,
          },
        );
        await client.query(
          "UPDATE orders SET shipping_email_sent=TRUE WHERE session_id=$1",
          [row.session_id],
        );
      } catch (err) {
        console.error("Failed to send shipping email for", row.session_id, err);
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
