const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

describe("network-check CDN hint", () => {
  test("suggests SKIP_PW_DEPS when CDN unreachable", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "curl-"));
    const fakeCurl = path.join(tmp, "curl");
    fs.writeFileSync(
      fakeCurl,
      '#!/bin/sh\nif echo "$@" | grep -q cdn.playwright.dev; then exit 1; fi\nexec /usr/bin/curl "$@"',
    );
    fs.chmodSync(fakeCurl, 0o755);
    expect(() => {
      execFileSync("node", [path.join("scripts", "network-check.js")], {
        env: { ...process.env, PATH: `${tmp}:${process.env.PATH}` },
        encoding: "utf8",
      });
    }).toThrow(/SKIP_PW_DEPS=1/);
  });
});
