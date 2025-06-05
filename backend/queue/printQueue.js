const queue = [];
let isProcessing = false;

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
  setTimeout(() => {
    console.log(`Finished printing job ${jobId}`);
    isProcessing = false;
    processQueue();
  }, 100);
}

function _getQueue() {
  return queue;
}

module.exports = { enqueuePrint, processQueue, _getQueue };
