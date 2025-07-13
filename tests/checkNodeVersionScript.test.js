const { execFileSync } = require("child_process");
const path = require("path");

describe("check-node-version script", () => {
  test("prints helpful message when version too low", () => {
    try {
      execFileSync("node", [path.join("scripts", "check-node-version.js")], {
        env: { ...process.env, REQUIRED_NODE_MAJOR: "25" },
        encoding: "utf8",
        stdio: "pipe",
      });
      throw new Error("script did not exit");
    } catch (err) {
      const output = (err.stdout || "") + (err.stderr || "");
      expect(output).toMatch(/Node 25 is required/);
      expect(output).toMatch(/mise use -g node@25/);
    }
  });

  test("succeeds when current version is higher", () => {
    execFileSync("node", [path.join("scripts", "check-node-version.js")], {
      env: { ...process.env, REQUIRED_NODE_MAJOR: "18" },
      encoding: "utf8",
      stdio: "pipe",
    });
  });
});
