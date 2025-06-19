const dotenv = require("dotenv");
dotenv.config();
const { Client } = require("pg");

async function checkPrinterFailures(threshold = 0.1, hours = 24) {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const { rows: printers } = await client.query(
      "SELECT id, serial FROM printers ORDER BY id",
    );
    for (const printer of printers) {
      const { rows } = await client.query(
        `SELECT status FROM printer_metrics WHERE printer_id=$1 AND created_at > NOW() - INTERVAL '${hours} hours'`,
        [printer.id],
      );
      const total = rows.length;
      const failures = rows.filter((r) => r.status === "error").length;
      if (total && failures / total > threshold) {
        console.log(
          `ALERT ${printer.serial}: failure rate ${((failures / total) * 100).toFixed(1)}%`,
        );
      }
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  const threshold = parseFloat(process.argv[2]) || 0.1;
  checkPrinterFailures(threshold).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = checkPrinterFailures;
