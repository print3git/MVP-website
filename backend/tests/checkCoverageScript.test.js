const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const script = path.join(__dirname, "..", "..", "scripts", "check-coverage.js");

describe("check-coverage script", () => {
  test("fails when coverage summary is missing", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cov-"));
    fs.writeFileSync(path.join(tmp, ".nycrc"), "{}");
    const result = spawnSync(process.execPath, [script], {
      cwd: tmp,
      encoding: "utf8",
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Missing coverage summary");
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
