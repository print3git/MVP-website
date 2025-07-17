// Jest integration test that fails if any error path is untested.

test("All API error paths are tested", () => {
  const { spawnSync } = require("child_process");
  const proc = spawnSync(
    "node",
    [
      "scripts/find-untested-error-paths.js",
      "--src=backend/src",
      "--tests=backend/tests",
    ],
    { encoding: "utf8" },
  );
  if (proc.status !== 0) {
    console.error(proc.stdout);
  }
  expect(proc.status).toBe(0);
});
