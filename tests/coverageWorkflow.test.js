const fs = require("fs");
const path = require("path");
const YAML = require("yaml");

describe("coverage workflow", () => {
  test("runs setup, coverage and uploads to coveralls", () => {
    const file = path.join(
      __dirname,
      "..",
      ".github",
      "workflows",
      "coverage.yml",
    );
    const yml = YAML.parse(fs.readFileSync(file, "utf8"));
    const steps = yml.jobs.coverage.steps.map((s) => s.run || "");
    const hasCoverage = steps.some((cmd) =>
      cmd.trim().startsWith("npm run coverage"),
    );
    const hasCoveralls = steps.some((cmd) => cmd.includes("npx coveralls"));
    const usesCat = steps.some((cmd) =>
      cmd.includes("cat backend/coverage/lcov.info"),
    );
    expect(hasSetup).toBe(true);
    expect(hasCoverage).toBe(true);
    expect(hasCoveralls).toBe(true);
    expect(usesCat).toBe(true);
  });
});
