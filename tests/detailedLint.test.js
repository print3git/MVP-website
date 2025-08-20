const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

describe("eslint detailed lint", () => {
  describe("granular messages", () => {
    test("controlled ts sample", () => {
      const prevCI = process.env.CI;
      process.env.CI = "1";
      const repoRoot = path.resolve(__dirname, "..");
      const eslintPath = path.join(
        repoRoot,
        "node_modules",
        "eslint",
        "bin",
        "eslint.js",
      );
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lint-"));
      const file = path.join(tmpDir, "sample.ts");
      fs.writeFileSync(file, "const unused=1;\n");
      const res = spawnSync(
        "node",
        [
          "--experimental-vm-modules",
          eslintPath,
          file,
          "-f",
          "json",
          "--config",
          path.join(repoRoot, "eslint.config.js"),
          "--no-warn-ignored",
        ],
        { cwd: tmpDir, encoding: "utf8" },
      );
      fs.rmSync(tmpDir, { recursive: true, force: true });
      if (prevCI === undefined) delete process.env.CI;
      else process.env.CI = prevCI;
      const messages = JSON.parse(res.stdout)[0].messages.map(
        ({ ruleId, severity, message }) => ({ ruleId, severity, message }),
      );
      expect(messages).toMatchSnapshot();
    });
  });
});
