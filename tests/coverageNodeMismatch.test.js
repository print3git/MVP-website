const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");

describe("run-coverage with mismatched node version", () => {
  test("fails when node version differs from requirement", () => {
    const node22 = "/root/.local/share/mise/installs/node/22.17.0/bin/node";
    if (!fs.existsSync(node22)) {
      console.warn("node 22 not installed, skipping test");
      return;
    }
    try {
      execFileSync(node22, [path.join("scripts", "run-coverage.js")], {
        env: { ...process.env, SKIP_NET_CHECKS: "1", SKIP_PW_DEPS: "1" },
        encoding: "utf8",
        stdio: "pipe",
      });
      throw new Error("script succeeded unexpectedly");
    } catch (err) {
      const output = (err.stdout || "") + (err.stderr || "");
      expect(output).toMatch(/Node 20/);
    }
  });
});
