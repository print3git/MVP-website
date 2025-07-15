const { execFileSync } = require("child_process");
const path = require("path");

describe("run-coverage node version check", () => {
  test("fails when node version does not match requirement", () => {
    const major = parseInt(process.versions.node.split(".")[0], 10);
    const env = { ...process.env, REQUIRED_NODE_MAJOR: String(major + 5) };
    try {
      execFileSync("node", [path.join("scripts", "run-coverage.js")], {
        env,
        encoding: "utf8",
        stdio: "pipe",
      });
      throw new Error("script did not exit");
    } catch (err) {
      const output = (err.stdout || "") + (err.stderr || "");
      expect(output).toMatch(new RegExp(`Node ${major + 5}`));
    }
  });
});
