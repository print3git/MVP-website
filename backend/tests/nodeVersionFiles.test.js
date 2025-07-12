const fs = require("fs");
const path = require("path");

describe("node version files", () => {
  test(".node-version pins Node 20", () => {
    const file = path.resolve(__dirname, "..", "..", ".node-version");
    const version = fs.readFileSync(file, "utf8").trim();
    expect(version.startsWith("20")).toBe(true);
  });

  test(".tool-versions pins Node 20", () => {
    const file = path.resolve(__dirname, "..", "..", ".tool-versions");
    const content = fs.readFileSync(file, "utf8");
    expect(/node\s+20/.test(content)).toBe(true);
  });
});
