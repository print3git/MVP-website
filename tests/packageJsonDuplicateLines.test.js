const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");

const files = [
  path.join(repoRoot, "package.json"),
  path.join(repoRoot, "backend", "package.json"),
];

describe("package.json files", () => {
  for (const file of files) {
    test(`${path.relative(repoRoot, file)} has no duplicate consecutive lines`, () => {
      const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
      for (let i = 1; i < lines.length; i++) {
        expect(lines[i]).not.toBe(lines[i - 1]);
      }
    });
  }
});
