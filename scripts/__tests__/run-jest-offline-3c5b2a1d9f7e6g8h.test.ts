const { execSync } = require("child_process");

test("run-jest skips tests in offline mode", () => {
  const output = execSync("SKIP_NET_CHECKS=1 node scripts/run-jest.js", {
    encoding: "utf8",
  });
  expect(output).toMatch(/offline mode: skipping jest/);
});
