const { TextEncoder, TextDecoder } = require('util');
require('jest-localstorage-mock');

// Dump open handles shortly before CI's global timeout to aid debugging
setTimeout(
  () => {
    console.log('Active handles before forced timeout:');
    console.log(process._getActiveHandles());
    console.log('Pending requests:', process._getActiveRequests());
  },
  19.5 * 60 * 1000
);
process.on('SIGTERM', () => {
  // eslint-disable-next-line no-console
  console.log('Active handles just before SIGTERM:', process._getActiveHandles());
  process.exit(1);
});
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (cb) => setTimeout(cb, 0);
}

afterEach(() => {
  if (global.window && typeof global.window.close === 'function') {
    global.window.close();
  }
  global.window = undefined;
  global.document = undefined;
  // restore real timers in case a test enabled fake timers
  if (jest.isMockFunction(setTimeout)) {
    // clear any pending timers to avoid open handles
    jest.clearAllTimers();
    jest.useRealTimers();
  }
});

afterAll(() => {
  console.log('Active handles:', process._getActiveHandles());
});
