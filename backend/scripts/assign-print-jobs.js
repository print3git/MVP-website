require('dotenv').config();
const { Client } = require('pg');

async function assignJobs() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const { rows: printers } = await client.query("SELECT id FROM printers WHERE status='idle'");
    for (const printer of printers) {
      const { rows } = await client.query(
        "SELECT id FROM print_jobs WHERE status='pending' AND printer_id IS NULL ORDER BY created_at LIMIT 1"
      );
      if (!rows.length) break;
      const job = rows[0];
      await client.query('UPDATE print_jobs SET printer_id=$1 WHERE id=$2', [printer.id, job.id]);
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  assignJobs().catch((err) => {
    console.error('Failed to assign jobs', err);
    process.exit(1);
  });
}

module.exports = assignJobs;
