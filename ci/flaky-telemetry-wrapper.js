const { afterAll } = require("@jest/globals");

const flakyTests = new Set();

function wrap(original) {
  return (name, fn, timeout) => {
    const t = original(name, fn, timeout);
    if (typeof name === "string" && name.includes("@flaky")) {
      t.retryTimes(2);
      flakyTests.add(name);
    }
    return t;
  };
}

global.test = wrap(global.test);
global.it = wrap(global.it);

afterAll(() => {
  if (flakyTests.size) {
    console.log(`[telemetry] flaky tests: ${flakyTests.size}`);
  }
});

module.exports = {};
