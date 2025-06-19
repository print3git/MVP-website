require("dotenv").config();
const { Client } = require("pg");
const { sendTemplate } = require("../mail");

const DAYS = parseInt(process.env.LEASE_RENEWAL_REMINDER_DAYS || "30", 10);
const DEFAULT_EMAIL = process.env.FOUNDER_EMAIL || "";

async function run() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      "SELECT founder_email, end_date FROM leases WHERE end_date <= NOW() + $1::interval",
      [`${DAYS} days`],
    );
    for (const row of rows) {
      const email = row.founder_email || DEFAULT_EMAIL;
      if (!email) continue;
      await sendTemplate(email, "Lease Renewal Reminder", "lease_renewal.txt", {
        end_date: row.end_date.toISOString().slice(0, 10),
      });
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  run();
}

module.exports = run;
