const fs = require("fs");
const path = require("path");

describe("environment", () => {
  test("jest binary installed", () => {
    const bin = path.join(__dirname, "..", "node_modules", ".bin", "jest");
    expect(fs.existsSync(bin)).toBe(true);
  });
});
