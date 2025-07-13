const fs = require("fs");
const path = require("path");

describe("lcov parse", () => {
  test("lcov file contains coverage markers", () => {
    const file = path.join(
      __dirname,
      "..",
      "..",
      "backend",
      "coverage",
      "lcov.info",
    );
    const content = fs.readFileSync(file, "utf8");
    expect(content.includes("TN:") || content.includes("SF:")).toBe(true);
  });
});
