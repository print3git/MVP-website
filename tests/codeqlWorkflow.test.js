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
});
