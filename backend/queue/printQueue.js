const queue = [];

function enqueuePrint(jobId) {
  // In a real system, this would push to a message broker
  if (jobId) {
    queue.push(jobId);
  }
}

function _getQueue() {
  return queue;
}

module.exports = { enqueuePrint, _getQueue };
