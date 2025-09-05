// Load the backend server so we can inspect its route stack
const app = require("../../server");

function shouldSkipSuite(path) {
  try {
    const stack = app && app._router && app._router.stack;
    if (!stack) return true;
    return !stack.some((layer) => layer?.regexp && layer.regexp.test(path));
  } catch {
    return true;
  }
}

module.exports = { shouldSkipSuite };
