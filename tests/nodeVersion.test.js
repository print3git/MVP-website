const fs = require("fs");
const path = require("path");

describe("node version", () => {
  test("runtime is exactly 20", () => {
    const major = parseInt(process.versions.node.split(".")[0], 10);
    expect(major).toBe(20);
  });

  test("root package.json engines field is 20.x", () => {
    const pkg = require("../package.json");
    expect(pkg.engines.node).toBe("20.x");
  });

  test("backend package.json engines field is 20.x", () => {
    const pkg = require("../backend/package.json");
    expect(pkg.engines.node).toBe("20.x");
  });

  test(".nvmrc specifies Node 20", () => {
    const version = fs
      .readFileSync(path.join(__dirname, "..", ".nvmrc"), "utf8")
      .trim();
    expect(version.replace(/^v/, "")).toMatch(/^20/);
  });

  test(".tool-versions pins Node 20", () => {
    const tv = fs
      .readFileSync(path.join(__dirname, "..", ".tool-versions"), "utf8")
      .trim();
    const match = tv.match(/node\s+(\d+)/);
    expect(match && match[1]).toBe("20");
  });
});
