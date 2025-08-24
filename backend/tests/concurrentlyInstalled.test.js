const fs = require("fs");
const path = require("path");

describe("dependencies", () => {
  test("concurrently installed", () => {
    const pkg = path.join(
      __dirname,
      "..",
      "..",
      "node_modules",
      "concurrently",
      "package.json",
    );
    expect(fs.existsSync(pkg)).toBe(true);
  });
});
