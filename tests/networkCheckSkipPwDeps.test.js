const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

describe("network-check SKIP_PW_DEPS", () => {
  test("skips Playwright CDN when SKIP_PW_DEPS=1", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "curl-"));
    const fakeCurl = path.join(tmp, "curl");
    fs.writeFileSync(
      fakeCurl,
      `#!/bin/sh\nif echo "$@" | grep -q cdn.playwright.dev; then exit 7; fi`,
    );
    fs.chmodSync(fakeCurl, 0o755);
    execFileSync("node", [path.join("scripts", "network-check.js")], {
      env: {
        ...process.env,
        PATH: `${tmp}:${process.env.PATH}`,
        SKIP_PW_DEPS: "1",
      },
      encoding: "utf8",
    });
  });
});
