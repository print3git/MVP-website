const db = require('../db');

async function getNextPendingJob() {
  const { rows } = await db.query(
    "SELECT job_id, webhook_url FROM print_jobs WHERE status='pending' ORDER BY created_at ASC LIMIT 1"
  );
  return rows[0];
}

async function updateJobStatus(jobId, status) {
  await db.query('UPDATE print_jobs SET status=$1 WHERE job_id=$2', [status, jobId]);
}

async function processNextJob() {
  const job = await module.exports.getNextPendingJob();
  if (!job) return;
  await fetch(job.webhook_url, { method: 'POST' });
  await module.exports.updateJobStatus(job.job_id, 'sent');
}

function startProcessing(intervalMs = 1000) {
  setTimeout(async function tick() {
    await processNextJob();
    setTimeout(tick, intervalMs);
  }, intervalMs);
}

module.exports = {
  startProcessing,
  processNextJob,
  getNextPendingJob,
  updateJobStatus,
};
