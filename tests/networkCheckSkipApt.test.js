const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

describe("network-check skip apt", () => {
  test("skips apt archive check when SKIP_PW_DEPS=1", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "curl-"));
    const fakeCurl = path.join(tmp, "curl");
    fs.writeFileSync(
      fakeCurl,
      '#!/bin/sh\nif echo "$@" | grep -q archive.ubuntu.com; then exit 7; fi\nexec /usr/bin/curl "$@"',
    );
    fs.chmodSync(fakeCurl, 0o755);
    const out = execFileSync(
      "node",
      [path.join("scripts", "network-check.js")],
      {
        env: {
          ...process.env,
          PATH: `${tmp}:${process.env.PATH}`,
          SKIP_PW_DEPS: "1",
        },
        encoding: "utf8",
      },
    );
    expect(out).toContain("✅ network OK");
  });
});
