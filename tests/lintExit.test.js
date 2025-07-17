const { spawnSync } = require("child_process");
const report = require("../lint-report.json");

test("ESLint reports no errors", () => {
  const proc = spawnSync("node", ["scripts/check-lint.js"], {
    encoding: "utf8",
  });
  if (proc.status !== 0) {
    console.error("ESLint errors:\n", JSON.stringify(report, null, 2));
  }
  expect(proc.status).toBe(0);
});
