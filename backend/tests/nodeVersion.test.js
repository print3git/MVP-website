const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");

describe("node version", () => {
  test("runtime is >=20", () => {
    const major = parseInt(process.versions.node.split(".")[0], 10);
    expect(major).toBeGreaterThanOrEqual(20);
  });

  test("root package.json engines field is >=20", () => {
    const pkg = require(path.join(root, "package.json"));
    expect(pkg.engines.node).toBe(">=20");
  });

  test("backend package.json engines field is >=20", () => {
    const pkg = require(path.join(root, "backend", "package.json"));
    expect(pkg.engines.node).toBe(">=20");
  });

  test(".nvmrc specifies Node 20", () => {
    const version = fs.readFileSync(path.join(root, ".nvmrc"), "utf8").trim();
    expect(version.replace(/^v/, "")).toMatch(/^20/);
  });
});
