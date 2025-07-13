const fs = require("fs");
const path = require("path");
const YAML = require("yaml");

describe("coverage workflow", () => {
  test("installs root & backend deps and uses npx coveralls", () => {
    const file = path.join(
      __dirname,
      "..",
      ".github",
      "workflows",
      "coverage.yml",
    );
    const yml = YAML.parse(fs.readFileSync(file, "utf8"));
    const steps = yml.jobs.coverage.steps.map((s) => s.run || "");
    const hasRootCi = steps.some((cmd) => cmd.trim() === "SKIP_PW_DEPS=1 npm run setup");
    const hasBackendCi = steps.some((cmd) => cmd.includes("npm run coverage"));
    const hasCoveralls = steps.some((cmd) => cmd.includes("npx coveralls"));
    expect(hasRootCi).toBe(true);
    expect(hasBackendCi).toBe(true);
    expect(hasCoveralls).toBe(true);
  });
});
