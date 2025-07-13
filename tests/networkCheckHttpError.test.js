const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

describe("network-check HTTP errors", () => {
  test("ignores non-2xx status", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "curl-"));
    const fakeCurl = path.join(tmp, "curl");
    fs.writeFileSync(fakeCurl, "#!/bin/sh\nexit 22");
    fs.chmodSync(fakeCurl, 0o755);
    expect(() => {
      execFileSync("node", [path.join("scripts", "network-check.js")], {
        env: {
          ...process.env,
          PATH: `${tmp}:${process.env.PATH}`,
          NETWORK_CHECK_URL: "http://localhost",
        },
        encoding: "utf8",
      });
    }).not.toThrow();
  });
});
