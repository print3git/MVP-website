const { EventEmitter } = require("events");

const queue = [];
let isProcessing = false;
const progressEmitter = new EventEmitter();
const COMPLETE_EVENT = "complete";

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
  progressEmitter.emit("progress", { jobId, progress });
  const interval = setInterval(() => {
    progress += 20;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      isProcessing = false;
      progressEmitter.emit("progress", { jobId, progress });
      progressEmitter.emit(COMPLETE_EVENT, { jobId });
      processQueue();
    } else {
      progressEmitter.emit("progress", { jobId, progress });
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
  COMPLETE_EVENT,
};
