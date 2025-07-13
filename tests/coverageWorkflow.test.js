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
    const hasSetup = steps.some((cmd) => cmd.includes("npm run setup"));
    const hasCoveralls = steps.some((cmd) => cmd.includes("npx coveralls"));
    expect(hasSetup).toBe(true);
    expect(hasCoveralls).toBe(true);
  });
});
