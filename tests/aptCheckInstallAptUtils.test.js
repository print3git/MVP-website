const { execFileSync } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

describe("apt-check installs apt-utils when missing", () => {
  test("installs apt-utils package", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aptlog-"));
    const log = path.join(tmp, "log");
    const binDir = path.join(__dirname, "bin-dpkg-no-utils");
    execFileSync("node", [path.join("scripts", "check-apt.js")], {
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        LOG_FILE: log,
      },
      encoding: "utf8",
    });
    const output = fs.readFileSync(log, "utf8");
    expect(output).toMatch(/install apt-utils/);
  });
});
