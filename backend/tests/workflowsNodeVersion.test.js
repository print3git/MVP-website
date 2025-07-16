const fs = require("fs");
const path = require("path");

describe("workflow Node versions", () => {
  test("no workflow uses Node 25", () => {
    const dir = path.resolve(__dirname, "..", "..", ".github", "workflows");
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".yml")) continue;
      const content = fs.readFileSync(path.join(dir, file), "utf8");
      expect(content).not.toMatch(/node-version:\s*25/);
    }
  });
});
