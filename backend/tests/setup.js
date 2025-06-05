const { TextEncoder, TextDecoder } = require('util');
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (cb) => setTimeout(cb, 0);
}
