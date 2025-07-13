const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

describe("network-check CDN HTTP error", () => {
  test("suggests SKIP_PW_DEPS when CDN responds with HTTP error", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "curl-"));
    const fakeCurl = path.join(tmp, "curl");
    fs.writeFileSync(
      fakeCurl,
      '#!/bin/sh\nif echo "$@" | grep -q cdn.playwright.dev; then echo "curl: (22)" >&2; exit 22; fi\nexec /usr/bin/curl "$@"',
    );
    fs.chmodSync(fakeCurl, 0o755);
    expect(() => {
      execFileSync("node", [path.join("scripts", "network-check.js")], {
        env: {
          ...process.env,
          PATH: `${tmp}:${process.env.PATH}`,
          SKIP_NET_CHECKS: "",
        },
        encoding: "utf8",
      });
    }).toThrow(/SKIP_PW_DEPS=1/);
  });
});
