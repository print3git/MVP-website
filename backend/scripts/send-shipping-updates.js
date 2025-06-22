require("dotenv").config();
const { Client } = require("pg");
const { sendTemplate } = require("../mail");
const { getTrackingStatus } = require("../shipping");

async function run() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT session_id, carrier, tracking_number, o.is_gift, email, username
         FROM orders o
         JOIN users u ON o.user_id=u.id
        WHERE o.status='shipped'
          AND o.tracking_number IS NOT NULL`,
    );
    for (const row of rows) {
      const status = await getTrackingStatus(
        row.carrier || "",
        row.tracking_number,
      );
      if (!status) continue;
      try {
        await sendTemplate(
          row.email,
          `Package update: ${status}`,
          "shipping_update.txt",
          {
            username: row.username,
            order_id: row.session_id,
            status,
          },
        );
        if (row.is_gift) {
          const giftRes = await client.query(
            `SELECT recipient_email FROM gifts WHERE order_id=$1 AND claimed_at IS NOT NULL`,
            [row.session_id],
          );
          const gift = giftRes.rows[0];
          if (gift && gift.recipient_email) {
            await sendTemplate(
              gift.recipient_email,
              `Package update: ${status}`,
              "shipping_update.txt",
              {
                username: "friend",
                order_id: row.session_id,
                status,
              },
            );
          }
        }
        if (status.toLowerCase() === "delivered") {
          await client.query(
            "UPDATE orders SET status='delivered' WHERE session_id=$1",
            [row.session_id],
          );
        }
      } catch (err) {
        console.error("Failed to send status update for", row.session_id, err);
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
