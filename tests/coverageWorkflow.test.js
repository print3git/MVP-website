const fs = require("fs");
const YAML = require("yaml");

test("coverage workflow uses setup script", () => {
  const content = fs.readFileSync(".github/workflows/coverage.yml", "utf8");
  const workflow = YAML.parse(content);
  const steps = workflow.jobs.coverage.steps || [];
  const hasSetup = steps.some(
    (s) =>
      s.run &&
      s.run.includes("npm run setup") &&
      s.run.includes("SKIP_PW_DEPS=1"),
  );
  expect(hasSetup).toBe(true);
});

test("coveralls listed in devDependencies", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  expect(pkg.devDependencies && pkg.devDependencies.coveralls).toBeDefined();
});
