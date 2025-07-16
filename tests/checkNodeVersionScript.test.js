const { execFileSync } = require("child_process");
const path = require("path");

describe("check-node-version script", () => {
  test("prints helpful message when version too low", () => {
    const requiredMajor = parseInt(process.versions.node.split(".")[0], 10) + 5;
    try {
      execFileSync("node", [path.join("scripts", "check-node-version.js")], {
        env: { ...process.env, REQUIRED_NODE_MAJOR: String(requiredMajor) },
        encoding: "utf8",
        stdio: "pipe",
      });
      throw new Error("script did not exit");
    } catch (err) {
      const output = (err.stdout || "") + (err.stderr || "");
      expect(output).toMatch(new RegExp(`Node ${requiredMajor} is required`));
      expect(output).toMatch(new RegExp(`mise use -g node@${requiredMajor}`));
    }
  });
});
