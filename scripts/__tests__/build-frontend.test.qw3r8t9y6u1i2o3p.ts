jest.mock("../run-npm-ci.js", () => ({ runNpmCi: jest.fn() }));
jest.mock("child_process", () => ({ execSync: jest.fn() }));

test("build-frontend installs deps offline and runs build", async () => {
  const { runNpmCi } = require("../run-npm-ci.js");
  const { execSync } = require("child_process");
  await import("../build-frontend.mjs");
  expect(runNpmCi).toHaveBeenCalledWith("frontend");
  expect(execSync).toHaveBeenCalledWith("npm run build", {
    cwd: "frontend",
    stdio: "inherit",
  });
});
