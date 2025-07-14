const fs = require("fs");
const path = require("path");

test("smoke test waits for viewer readiness", () => {
  const content = fs.readFileSync(path.join("e2e", "smoke.test.js"), "utf8");
  expect(content).toMatch(/dataset\.viewerReady/);
  expect(content).toMatch(/timeout:\s*120000/);
});
