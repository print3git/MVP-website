const fs = require("fs");
const YAML = require("yaml");

test("coverage workflow uses setup script", () => {
  const content = fs.readFileSync(".github/workflows/coverage.yml", "utf8");
  const workflow = YAML.parse(content);
  const steps = workflow.jobs.coverage.steps || [];
  const hasSetup = steps.some((s) => s.run && s.run.includes("npm run setup"));
  expect(hasSetup).toBe(true);
});

test("coverage workflow pipes lcov output to coveralls", () => {
  const content = fs.readFileSync(".github/workflows/coverage.yml", "utf8");
  const workflow = YAML.parse(content);
  const steps = workflow.jobs.coverage.steps || [];
  const coverallsStep = steps.find((s) => s.run && s.run.includes("coveralls"));
  expect(coverallsStep && coverallsStep.run).toBe(
    "npm run coverage-lcov | npx coveralls",
  );
});

test("coveralls listed in devDependencies", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  expect(pkg.devDependencies && pkg.devDependencies.coveralls).toBeDefined();
});
