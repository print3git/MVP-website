const fs = require("fs");
const path = require("path");
const YAML = require("yaml");

describe("codeql workflow", () => {
  test("has security-events write permission", () => {
    const file = path.join(
      __dirname,
      "..",
      ".github",
      "workflows",
      "codeql.yml",
    );
    const yml = YAML.parse(fs.readFileSync(file, "utf8"));
    const perms =
      yml.permissions ||
      (yml.jobs && yml.jobs.analyze && yml.jobs.analyze.permissions) ||
      {};
    expect(perms["security-events"]).toBe("write");
  });
});
