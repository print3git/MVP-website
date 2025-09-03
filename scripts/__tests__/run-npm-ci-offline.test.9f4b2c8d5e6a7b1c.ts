jest.mock("child_process", () => ({ execSync: jest.fn() }));
const { execSync } = require("child_process");

test("run-npm-ci uses offline mode when network unavailable", () => {
  process.env.SKIP_NET_CHECKS = "1";
  const { runNpmCi } = require("../run-npm-ci.js");
  runNpmCi(".", { ignoreScripts: true });
  expect(execSync).toHaveBeenCalledWith(
    expect.stringContaining(
      "npm ci --no-audit --no-fund --ignore-scripts --prefer-offline",
    ),
    expect.objectContaining({ stdio: "inherit" }),
  );
});
