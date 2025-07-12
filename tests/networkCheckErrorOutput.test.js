const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

describe("network-check diagnostics", () => {
  test("prints curl error output when failing", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "curl-"));
    const fakeCurl = path.join(tmp, "curl");
    fs.writeFileSync(fakeCurl, "#!/bin/sh\necho 'curl: (7) bad' >&2\nexit 7");
    fs.chmodSync(fakeCurl, 0o755);
    expect(() => {
      execFileSync("node", [path.join("scripts", "network-check.js")], {
        env: { ...process.env, PATH: `${tmp}:${process.env.PATH}` },
        encoding: "utf8",
      });
    }).toThrow(/curl: \(7\) bad/);
  });
});
