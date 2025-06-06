const db = require('../db');

// Emits progress updates for print jobs. When a job is enqueued we
// insert a record into the print_jobs table so a worker can process it
// asynchronously. For now we simply emit an initial progress event so
// tests can verify that the job was scheduled.
  await db.query(
    'INSERT INTO print_jobs(job_id, session_id, shipping_info) VALUES($1,$2,$3)',
    [jobId, sessionId, shippingInfo]
  );
// progress event when enqueued.

const progressEmitter = new EventEmitter();

async function enqueuePrint(jobId, sessionId, shippingInfo) {
  if (!jobId) return;
  // placeholder async operation
  progressEmitter.emit('progress', { jobId, progress: 0, sessionId, shippingInfo });
}

module.exports = {
  enqueuePrint,
  progressEmitter,
};

