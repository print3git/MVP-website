const config = require("../playwright.config.js");

test("playwright test timeout is at least 60s", () => {
  expect(config.timeout).toBeGreaterThanOrEqual(60 * 1000);
});
