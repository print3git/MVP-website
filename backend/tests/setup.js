// backend/tests/setup.js

const { TextEncoder, TextDecoder } = require("util");
require("jest-localstorage-mock");
const nock = require("nock");

// On GitHub Actions “Cancel workflow” → SIGTERM path
process.on("SIGTERM", () => {
  process.exit(1);
});

// Ensure TextEncoder/TextDecoder in Node
if (typeof global.TextEncoder === "undefined") {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === "undefined") {
  global.TextDecoder = TextDecoder;
}

// Polyfill setImmediate if missing
if (typeof global.setImmediate === "undefined") {
  global.setImmediate = (cb) => setTimeout(cb, 0);
}

beforeEach(() => {
  delete process.env.http_proxy;
  delete process.env.https_proxy;
  delete process.env.HTTP_PROXY;
  delete process.env.HTTPS_PROXY;
  nock.disableNetConnect();
  nock.enableNetConnect("127.0.0.1");
  global.consoleErrors = [];
  jest.spyOn(console, "error").mockImplementation((...args) => {
    const msg = args.join(" ");
    if (msg.includes("Could not load script")) return;
    global.consoleErrors.push(msg);
  });
  jest.spyOn(console, "log").mockImplementation(() => {});
});

// Clean up between tests
afterEach(() => {
  jest.restoreAllMocks();

  nock.cleanAll();

  if (global.window && typeof global.window.close === "function") {
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
// console.log('Active handles on exit:', process._getActiveHandles());
// console.log('Pending requests on exit:', process._getActiveRequests());
// console.log('Timeout Warning: ...');
afterAll(() => {
  // debug logs removed to keep test output clean
  nock.enableNetConnect();
});
