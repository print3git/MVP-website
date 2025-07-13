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
    const hasCoveralls = steps.some((cmd) => cmd.includes("npx coveralls"));
    const coverageStep = steps.find((cmd) => cmd.includes("npm run coverage"));
    const usesTextLcov =
      coverageStep && coverageStep.includes("--coverageReporters=text-lcov");
    expect(hasCoveralls).toBe(true);
    expect(usesTextLcov).toBe(true);
  });
});
