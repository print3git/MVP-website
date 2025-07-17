const { spawnSync } = require("child_process");

test("All functions in backend/src have JSDoc", () => {
  const proc = spawnSync(
    "node",
    ["scripts/find-missing-jsdoc.js", "--dir=backend/src"],
    { encoding: "utf8" },
  );
  const { status, stdout } = proc;
  if (status !== 0) {
    console.error("\n" + stdout);
    throw new Error("Missing JSDoc comments detected");
  }
  expect(status).toBe(0);
  // expect(stdout).toMatch("✅ All functions have JSDoc comments.");
});
