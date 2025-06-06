const db = require('../db');

async function enqueuePrint(jobId, orderId, options) {
  return db.query('INSERT INTO print_jobs(job_id, order_id, options) VALUES($1,$2,$3)', [
    jobId,
    orderId,
    options,
  ]);
}

module.exports = { enqueuePrint };
