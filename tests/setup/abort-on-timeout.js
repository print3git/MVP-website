const MAX_TEST_DURATION = 10 * 60 * 1000; // 10 minutes
const util = require('util');
let timer;

function dumpHandles() {
  const handles = process._getActiveHandles();
  if (handles.length) {
    console.error('\nActive handles:');
    handles.forEach((h, i) => {
      console.error(`${i + 1}:`, util.inspect(h));
    });
  }
  const requests = process._getActiveRequests();
  if (requests.length) {
    console.error('\nActive requests:');
    requests.forEach((r, i) => {
      console.error(`${i + 1}:`, util.inspect(r));
    });
  }
}

beforeEach(() => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    console.error(`\n❌ Test exceeded ${MAX_TEST_DURATION}ms`);
    dumpHandles();
    console.error(new Error('Test timeout exceeded').stack);
    // Ensure non-zero exit so CI fails
    process.exit(1);
  }, MAX_TEST_DURATION);
  // Allow process to exit naturally when tests finish
  if (timer.unref) timer.unref();
});

afterEach(() => {
  clearTimeout(timer);
});
