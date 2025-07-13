const fs = require("fs");
const path = require("path");

test("smoke test connectivity uses -f", () => {
  const content = fs.readFileSync(path.join("e2e", "smoke.test.js"), "utf8");
  expect(content).toMatch(/curl -fIs/);
});
