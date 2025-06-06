
const { EventEmitter } = require('events');

// Simple database-backed print queue placeholder
// In a real implementation this would enqueue a job in the database so
// a worker can process it. For tests and development we simply emit a
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

