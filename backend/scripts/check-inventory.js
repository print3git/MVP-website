require("dotenv").config();
const { Client } = require("pg");
const { sendMail } = require("../mail");

const ALERT_EMAIL = process.env.INVENTORY_ALERT_EMAIL || "";

async function checkInventory() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT h.name, i.material, i.quantity, i.threshold
         FROM hub_inventory i
         JOIN printer_hubs h ON i.hub_id=h.id
        WHERE i.quantity < i.threshold`,
    );
    if (rows.length) {
      const lines = rows.map((r) => `${r.name} - ${r.material}: ${r.quantity}`);
      const message = lines.join("\n");
      if (ALERT_EMAIL) {
        await sendMail(ALERT_EMAIL, "Low inventory alert", message);
      } else {
        console.log(message);
      }
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  checkInventory();
}

module.exports = checkInventory;
