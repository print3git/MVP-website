const db = require('../db');

async function enqueuePrint(jobId, orderId, printerId, gcodePath, shippingInfo) {
  await db.query(
    'INSERT INTO print_jobs(job_id, order_id, printer_id, gcode_path, shipping_info) VALUES($1,$2,$3,$4,$5)',
    [jobId, orderId, printerId, gcodePath, shippingInfo]
  );
}

async function getNextPendingJob() {
  const { rows } = await db.query(
    "SELECT * FROM print_jobs WHERE status='pending' ORDER BY created_at ASC LIMIT 1"
  );
  return rows[0] || null;
}

async function updateJobStatus(id, status) {
  await db.query('UPDATE print_jobs SET status=$1 WHERE id=$2', [status, id]);
}

module.exports = { enqueuePrint, getNextPendingJob, updateJobStatus };
