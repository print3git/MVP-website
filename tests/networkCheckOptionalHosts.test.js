const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

describe("network-check optional hosts", () => {
  test("continues when optional hosts fail", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "curl-"));
    const fakeCurl = path.join(tmp, "curl");
    fs.writeFileSync(
      fakeCurl,
      '#!/bin/sh\nif echo "$@" | grep -q esm.sh; then exit 7; fi\nif echo "$@" | grep -q jsdelivr; then exit 7; fi\nexec /usr/bin/curl "$@"',
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
