require('dotenv').config();
const { Client } = require('pg');
const axios = require('axios');

const DEFAULT_PRINTER_API_URL = process.env.PRINTER_API_URL || 'http://localhost:5000/print';
const POLL_INTERVAL_MS = 5000;

async function getNextPendingJob(client) {
  const { rows } = await client.query(
    `SELECT pj.id, pj.job_id, pj.gcode_path, pj.shipping_info, p.api_url
       FROM print_jobs pj
       JOIN printers p ON pj.printer_id=p.id
      WHERE pj.status='pending'
      ORDER BY pj.created_at
      LIMIT 1`
  );
  return rows[0] || null;
}

async function processNextJob(client) {
  const job = await getNextPendingJob(client);
  if (!job) return;

  const { id, gcode_path: gcodePath, api_url, shipping_info: shipping } = job;
  const url = api_url || DEFAULT_PRINTER_API_URL;
  try {
    await axios.post(url, { gcodePath, shipping });
    await client.query('UPDATE print_jobs SET status=$1 WHERE id=$2', ['sent', id]);
  } catch (err) {
    await client.query('UPDATE print_jobs SET status=$1 WHERE id=$2', ['error', id]);
  }
}

async function run(interval = POLL_INTERVAL_MS) {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  setInterval(() => {
    processNextJob(client).catch((err) => console.error('Worker error', err));
  }, interval);
}

if (require.main === module) {
  run();
}

module.exports = { run };
