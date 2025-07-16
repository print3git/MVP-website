const fs = require("fs");
const path = require("path");

describe("workflow Node versions", () => {
  test("workflows use Node 20 when specified", () => {
    const dir = path.resolve(__dirname, "..", "..", ".github", "workflows");
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".yml")) continue;
      const content = fs.readFileSync(path.join(dir, file), "utf8");
      const match = content.match(/node-version:\s*(\d+)/);
      if (match) {
        expect(match[1]).toBe("20");
      }
    }
  });
});
