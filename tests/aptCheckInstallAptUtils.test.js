const { execFileSync } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

describe("apt-check when apt-utils is missing", () => {
  test("fails without attempting installation", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aptlog-"));
    const log = path.join(tmp, "log");
    const binDir = path.join(__dirname, "bin-dpkg-no-utils");
    expect(() => {
      execFileSync("node", [path.join("scripts", "check-apt.js")], {
        env: {
          ...process.env,
          PATH: `${binDir}:${process.env.PATH}`,
          LOG_FILE: log,
        },
        encoding: "utf8",
      });
    }).toThrow(/apt-utils package is missing/);
    const output = fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "";
    expect(output).toBe("");
  });
});
