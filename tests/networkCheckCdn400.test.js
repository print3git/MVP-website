const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

describe("network-check CDN 400", () => {
  test("treats HTTP 400 from CDN as success", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "curl-"));
    const fakeCurl = path.join(tmp, "curl");
    fs.writeFileSync(
      fakeCurl,
      '#!/bin/sh\nif echo "$@" | grep -q cdn.playwright.dev; then echo \'curl: (22) The requested URL returned error: 400\' >&2; exit 22; fi\nexec /usr/bin/curl "$@"',
    );
    fs.chmodSync(fakeCurl, 0o755);
    const out = execFileSync(
      "node",
      [path.join("scripts", "network-check.js")],
      {
        env: { ...process.env, PATH: `${tmp}:${process.env.PATH}` },
        encoding: "utf8",
      },
    );
    expect(out).toContain("✅ network OK");
  });
});
