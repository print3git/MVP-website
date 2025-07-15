const fs = require("fs");
const path = require("path");
const YAML = require("yaml");

describe("codeql workflow", () => {
  test("has required permissions", () => {
    const file = path.join(
      __dirname,
      "..",
      ".github",
      "workflows",
      "codeql.yml",
    );
    const yml = YAML.parse(fs.readFileSync(file, "utf8"));
    expect(yml.permissions).toBeDefined();
    expect(yml.permissions.actions).toBe("read");
    expect(yml.permissions.contents).toBe("read");
    expect(yml.permissions["security-events"]).toBe("write");
  });

  test("checks code scanning step", () => {
    const file = path.join(
      __dirname,
      "..",
      ".github",
      "workflows",
      "codeql.yml",
    );
    const yml = YAML.parse(fs.readFileSync(file, "utf8"));
    const steps = yml.jobs.analyze.steps;
    const hasCheck = steps.some(
      (s) => s.run && s.run.includes("check-code-scanning.js"),
    );
    expect(hasCheck).toBe(true);
  });

  test("uses run-npm-ci helper in build step", () => {
    const file = path.join(
      __dirname,
      "..",
      ".github",
      "workflows",
      "codeql.yml",
    );
    const yml = YAML.parse(fs.readFileSync(file, "utf8"));
    const steps = yml.jobs.analyze.steps.map((s) => s.run || "");
    const hasHelper = steps.some((cmd) => cmd.includes("run-npm-ci.js"));
    expect(hasHelper).toBe(true);
  });
});
