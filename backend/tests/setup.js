const { TextEncoder, TextDecoder } = require('util');
require('jest-localstorage-mock');
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
});

afterAll(() => {
  jest.useRealTimers();
});
