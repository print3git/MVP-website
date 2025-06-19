require("dotenv").config();
const { Client } = require("pg");
const path = require("path");
const { emailVendorApproval } = require("../procurement");

const THRESHOLD = parseFloat(
  process.env.HUB_SATURATION_PURCHASE_THRESHOLD || "0.85",
);
const DAYS = parseInt(process.env.HUB_SATURATION_DAYS || "3", 10);
const VENDOR_EMAIL = process.env.PRINTER_VENDOR_EMAIL || "";
const PRINTER_VENDOR = process.env.PRINTER_VENDOR || "ACME Printers";
const PRINTER_MODEL = process.env.PRINTER_MODEL || "MVP Printer";
const QUANTITY = parseInt(process.env.PRINTER_ORDER_QUANTITY || "2", 10);

async function run() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const res = await client.query(
      `SELECT hub_id, AVG(avg_queue_saturation) AS avg_sat
         FROM hub_saturation_summary
        WHERE summary_date >= NOW() - INTERVAL '${DAYS} days'
        GROUP BY hub_id`,
    );
    for (const row of res.rows) {
      const saturation = parseFloat(row.avg_sat);
      if (saturation > THRESHOLD) {
        const hubRes = await client.query(
          "SELECT name, location FROM printer_hubs WHERE id=$1",
          [row.hub_id],
        );
        const hub = hubRes.rows[0];
        const order = {
          vendor: PRINTER_VENDOR,
          items: [{ model: PRINTER_MODEL, quantity: QUANTITY }],
        };
        const outPath = path.join("/tmp", `po_hub_${row.hub_id}.pdf`);
        await emailVendorApproval(
          order,
          VENDOR_EMAIL,
          `Ship to ${hub.name} in ${hub.location}`,
          outPath,
        );
        const targetDate = new Date(Date.now() + 30 * 86400000)
          .toISOString()
          .slice(0, 10);
        await client.query(
          "INSERT INTO expansions(region, target_date) VALUES($1,$2) ON CONFLICT DO NOTHING",
          [hub.location, targetDate],
        );
      }
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = run;
