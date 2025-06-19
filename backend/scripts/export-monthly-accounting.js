require("dotenv").config();
const { Client } = require("pg");
const fs = require("fs");

async function exportMonth(month, outPath = "accounting.csv") {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT session_id, created_at::date AS date,
              price_cents, discount_cents,
              COALESCE(shipping_info->>'country', '') AS country,
              status
         FROM orders
        WHERE date_trunc('month', created_at) = date_trunc('month', $1::date)
        ORDER BY created_at`,
      [month],
    );
    const lines = ["date,session_id,country,price_cents,discount_cents,status"];
    for (const r of rows) {
      lines.push(
        `${r.date},${r.session_id},${r.country},${r.price_cents},${r.discount_cents},${r.status}`,
      );
    }
    fs.writeFileSync(outPath, lines.join("\n"));
    console.log(`Exported ${rows.length} orders to ${outPath}`);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  const month = process.argv[2];
  if (!month) {
    console.error("Usage: node export-monthly-accounting.js YYYY-MM");
    process.exit(1);
  }
  exportMonth(month, process.argv[3]).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = exportMonth;
