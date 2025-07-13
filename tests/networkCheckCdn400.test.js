const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

/** Simulate the CDN returning HTTP 400 but with exit status 0. */
describe("network-check CDN 400", () => {
  test("succeeds when CDN returns HTTP 400", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "curl-"));
    const fakeCurl = path.join(tmp, "curl");
    fs.writeFileSync(
      fakeCurl,
      '#!/bin/sh\nif echo "$@" | grep -q cdn.playwright.dev; then echo "HTTP/1.1 400 Bad Request"; exit 0; fi\nexec /usr/bin/curl "$@"',
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
