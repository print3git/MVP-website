test("Branch coverage ≥ 90%", () => {
  const { spawnSync } = require("child_process");
  const proc = spawnSync(
    "node",
    ["scripts/find-branch-coverage-gaps.js", "--min=90"],
    { encoding: "utf8" },
  );
  if (proc.status !== 0) {
    console.error(proc.stdout);
  }
  expect(proc.status).toBe(0);
});
