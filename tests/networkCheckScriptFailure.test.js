const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

describe("network-check failure", () => {
  test("exits when curl fails", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "curl-"));
    const fakeCurl = path.join(tmp, "curl");
    fs.writeFileSync(fakeCurl, "#!/bin/sh\nexit 1");
    fs.chmodSync(fakeCurl, 0o755);
    expect(() => {
      execFileSync("node", [path.join("scripts", "network-check.js")], {
        env: { ...process.env, PATH: `${tmp}:${process.env.PATH}` },
        encoding: "utf8",
      });
    }).toThrow(/Unable to reach/);
  });
});
