require('dotenv').config();
const { Client } = require('pg');
const axios = require('axios');

async function monitorPrinters() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const { rows } = await client.query('SELECT id, api_url FROM printers');
    for (const printer of rows) {
      try {
        const { data } = await axios.get(`${printer.api_url}/status`);
        const status = data.status || 'unknown';
        await client.query('UPDATE printers SET status=$1, last_seen=NOW() WHERE id=$2', [
          status,
          printer.id,
        ]);
      } catch (err) {
        await client.query('UPDATE printers SET status=$1 WHERE id=$2', ['offline', printer.id]);
      }
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  monitorPrinters().catch((err) => {
    console.error('Failed to monitor printers', err);
    process.exit(1);
  });
}

module.exports = monitorPrinters;
