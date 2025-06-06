const db = require('../db');

async function enqueuePrint(jobId, orderId, shippingInfo) {
  await db.query(
    'INSERT INTO print_jobs(job_id, order_id, shipping_info) VALUES($1,$2,$3)',
    [jobId, orderId, shippingInfo]
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
