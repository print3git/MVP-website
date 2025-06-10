const { EventEmitter } = require('events');

const queue = [];
let isProcessing = false;
let currentInterval = null;
const progressEmitter = new EventEmitter();

function enqueuePrint(jobId) {
  // In a real system, this would push to a message broker
  if (jobId) {
    queue.push(jobId);
    processQueue();
  }
}

function processQueue() {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;
  const jobId = queue.shift();
  let progress = 0;
  progressEmitter.emit('progress', { jobId, progress });
  currentInterval = setInterval(() => {
    progress += 20;
    if (progress >= 100) {
      progress = 100;
      clearInterval(currentInterval);
      currentInterval = null;
      isProcessing = false;
      progressEmitter.emit('progress', { jobId, progress });
      processQueue();
    } else {
      progressEmitter.emit('progress', { jobId, progress });
    }
  }, 100);
}

function _getQueue() {
  return queue;
}

module.exports = {
  enqueuePrint,
  processQueue,
  _getQueue,
  progressEmitter,
  reset: () => {
    if (currentInterval) {
      clearInterval(currentInterval);
      currentInterval = null;
    }
    queue.length = 0;
    isProcessing = false;
  },
};
