require("dotenv").config();
const { Client } = require("pg");
const { sendMail } = require("../mail");

const ALERT_EMAIL = process.env.PROCUREMENT_ALERT_EMAIL || "";

async function run() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, hub_id, vendor, model, quantity, est_arrival_date
         FROM procurement_orders
        WHERE est_arrival_date IS NOT NULL
          AND est_arrival_date < CURRENT_DATE
          AND flagged_overdue=FALSE`,
    );
    for (const row of rows) {
      const msg = `Order #${row.id} for hub ${row.hub_id} is overdue (expected ${row.est_arrival_date.toISOString().slice(0, 10)})`;
      if (ALERT_EMAIL) {
        await sendMail(ALERT_EMAIL, "Overdue printer delivery", msg);
      } else {
        console.log(msg);
      }
      await client.query(
        "UPDATE procurement_orders SET flagged_overdue=TRUE WHERE id=$1",
        [row.id],
      );
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  run();
}

module.exports = run;
