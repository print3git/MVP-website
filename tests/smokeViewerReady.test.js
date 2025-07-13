const fs = require("fs");
const path = require("path");

test("smoke test waits for viewer readiness", () => {
  const content = fs.readFileSync(path.join("e2e", "smoke.test.js"), "utf8");
  expect(content).toMatch(/body\[data-viewer-ready="true"\]/);
  expect(content).toMatch(/timeout:\s*120000/);
});
