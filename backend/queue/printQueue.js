const async = require('async');
const queue = async.queue((jobId, cb) => {
  setTimeout(() => {
    console.log(`Finished printing job ${jobId}`);
    cb();
  }, 100);
}, 1);

function enqueuePrint(jobId) {
  if (jobId) queue.push(jobId);
}

function processQueue() {
  // async.queue processes tasks automatically
}

function _getQueue() {
  return queue;
}

module.exports = { enqueuePrint, processQueue, _getQueue };
