require('dotenv').config();
const { Client } = require('pg');
const { getPrinterInfo } = require('../printers/octoprint');

const OCTOPRINT_API_KEY = process.env.OCTOPRINT_API_KEY || '';
const POLL_INTERVAL_MS = parseInt(process.env.PRINTER_POLL_INTERVAL_MS || '60000', 10);
const PRINTER_URLS = (process.env.PRINTER_URLS || '')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);

async function pollPrinters(client) {
  for (const url of PRINTER_URLS) {
    const { rows } = await client.query('SELECT id FROM printers WHERE serial=$1', [url]);
    const printerId = rows.length
      ? rows[0].id
      : (await client.query('INSERT INTO printers(serial) VALUES($1) RETURNING id', [url])).rows[0]
          .id;
    try {
      const info = await getPrinterInfo(url, OCTOPRINT_API_KEY);
      await client.query(
        'INSERT INTO printer_metrics(printer_id, status, queue_length, error) VALUES($1,$2,$3,$4)',
        [printerId, info.status, info.queueLength, info.error]
      );
      await client.query('UPDATE printers SET last_heartbeat=NOW() WHERE id=$1', [printerId]);
    } catch (err) {
      await client.query(
        'INSERT INTO printer_metrics(printer_id, status, queue_length, error) VALUES($1,$2,$3,$4)',
        [printerId, 'offline', 0, err.message]
      );
    }
  }
}

async function run(interval = POLL_INTERVAL_MS) {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  setInterval(() => {
    pollPrinters(client).catch((err) => console.error('Telemetry worker error', err));
  }, interval);
}

if (require.main === module) {
  run();
}

module.exports = { run, pollPrinters };
