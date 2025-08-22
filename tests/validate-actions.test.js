const glob = require("glob");
const fs = require("fs");
const { parse } = require("yaml");
const { execFileSync } = require("child_process");

describe("GitHub actions definitions", () => {
  const actionFiles = glob.sync(".github/actions/**/action.y?(a)ml");

  test("yamllint parses all action files", () => {
    for (const file of actionFiles) {
      execFileSync("yamllint", ["-d", "{rules: {}}", file]);
    }
  });

  test("actions have required fields", () => {
    for (const file of actionFiles) {
      const data = parse(fs.readFileSync(file, "utf8"));
      expect(data.name).toBeTruthy();
      expect(data.description).toBeTruthy();
      expect(data.runs).toBeTruthy();
      if (data.runs && data.runs.using === "composite") {
        expect(Array.isArray(data.runs.steps)).toBe(true);
        expect(data.runs.steps.length).toBeGreaterThan(0);
      }
    }
  });
});
