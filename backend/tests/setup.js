// backend/tests/setup.js

const { TextEncoder, TextDecoder } = require('util');
require('jest-localstorage-mock');

// On GitHub Actions “Cancel workflow” → SIGTERM path
process.on('SIGTERM', () => {
  // eslint-disable-next-line no-console
  console.log('Active handles just before SIGTERM:', process._getActiveHandles());
  process.exit(1);
});

// Ensure TextEncoder/TextDecoder in Node
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Polyfill setImmediate if missing
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (cb) => setTimeout(cb, 0);
}

// Clean up between tests
afterEach(() => {
  if (global.window && typeof global.window.close === 'function') {
    global.window.close();
  }
  global.window = undefined;
  global.document = undefined;

  // If a test used fake timers, clear them and restore real timers
  if (jest.isMockFunction(setTimeout)) {
    jest.clearAllTimers();
    jest.useRealTimers();
  }
});

// Final diagnostic dump on normal Jest exit
afterAll(() => {
  // eslint-disable-next-line no-console
  console.log('Active handles on exit:', process._getActiveHandles());
  // eslint-disable-next-line no-console
  console.log('Pending requests on exit:', process._getActiveRequests());
});
