const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

test("reports tests above 90th percentile", () => {
  const file = path.join(__dirname, "sample-jest.json");
  const data = {
    testResults: [
      { name: "a.test.js", perfStats: { start: 0, end: 10 } },
      { name: "b.test.js", perfStats: { start: 0, end: 100 } },
      { name: "c.test.js", perfStats: { start: 0, end: 20 } },
    ],
  };
  fs.writeFileSync(file, JSON.stringify(data));
  const out = execSync(
    `node ${path.join(__dirname, "..", "scripts", "flaky-test-detector.js")} ${file}`,
    { encoding: "utf8" },
  );
  expect(out).toMatch(/b\.test\.js/);
});
