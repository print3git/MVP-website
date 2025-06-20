require("dotenv").config();
const { Client } = require("pg");
const { sendMail } = require("../mail");

async function notifyManualClearing() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT p.serial, h.operator, m.error
         FROM printers p
         JOIN printer_hubs h ON p.hub_id=h.id
         JOIN LATERAL (
           SELECT error
             FROM printer_metrics
            WHERE printer_id=p.id
         ORDER BY created_at DESC
            LIMIT 1
         ) m ON TRUE
        WHERE m.error ILIKE '%clear%'`,
    );
    for (const row of rows) {
      if (!row.operator) continue;
      const message = `Printer ${row.serial} requires manual clearing: ${row.error}`;
      await sendMail(row.operator, "Printer requires manual clearing", message);
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  notifyManualClearing();
}

module.exports = notifyManualClearing;
