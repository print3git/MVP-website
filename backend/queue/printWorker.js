require('dotenv').config();
const { Client } = require('pg');
const axios = require('axios');

const PRINTER_API_URL = process.env.PRINTER_API_URL || 'http://localhost:5000/print';
const POLL_INTERVAL_MS = 5000;

async function getNextPendingJob(client) {
  const { rows } = await client.query(
    `SELECT j.job_id
       FROM jobs j
       JOIN orders o ON j.job_id=o.job_id
      WHERE j.status='complete' AND o.status='paid'
      ORDER BY j.created_at
      LIMIT 1`
  );
  return rows[0] && rows[0].job_id;
}

async function processNextJob(client) {
  const jobId = await getNextPendingJob(client);
  if (!jobId) return;

  const { rows } = await client.query(
    `SELECT j.model_url, o.shipping_info, o.etch_name
       FROM jobs j
       JOIN orders o ON j.job_id=o.job_id
      WHERE j.job_id=$1`,
    [jobId]
  );
  if (!rows.length) return;


  const { model_url: modelUrl, shipping_info: shipping, etch_name } = rows[0];
  try {
    await axios.post(PRINTER_API_URL, { modelUrl, shipping, etchName: etch_name });

    await client.query('UPDATE jobs SET status=$1, error=NULL WHERE job_id=$2', ['sent', jobId]);
  } catch (err) {
    await client.query('UPDATE jobs SET error=$1 WHERE job_id=$2', [err.message, jobId]);
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
