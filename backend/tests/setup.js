// backend/tests/setup.js

const { TextEncoder, TextDecoder } = require('util');
require('jest-localstorage-mock');

// On GitHub Actions “Cancel workflow” → SIGTERM path
process.on('SIGTERM', () => {
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

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    throw new Error('console.error called: ' + args.join(' '));
  });
});

// Clean up between tests
afterEach(() => {
  if (console.error && console.error.mockRestore) {
    console.error.mockRestore();
  }
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
afterAll(() => {});
