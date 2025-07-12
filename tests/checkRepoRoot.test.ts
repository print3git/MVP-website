const { execFileSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const script = path.join(root, "scripts", "check-repo-root.js");

describe("check-repo-root", () => {
  test("passes when run from repo root", () => {
    execFileSync("node", [script], { cwd: root, stdio: "pipe" });
  });

  test("fails outside repo root", () => {
    const cwd = path.join(root, "backend");
    expect(() =>
      execFileSync("node", [script], { cwd, stdio: "pipe" }),
    ).toThrow();
  });
});
