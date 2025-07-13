const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

describe("backend format network failure", () => {
  test("fails when Playwright CDN unreachable", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "curl-"));
    const fakeCurl = path.join(tmp, "curl");
    fs.writeFileSync(
      fakeCurl,
      '#!/bin/sh\nif echo "$@" | grep -q cdn.playwright.dev; then exit 1; fi\nexec /usr/bin/curl "$@"',
    );
    fs.chmodSync(fakeCurl, 0o755);
    const env = {
      ...process.env,
      HF_TOKEN: "test",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      DB_URL: "postgres://user:pass@localhost/db",
      STRIPE_SECRET_KEY: "sk_test",
      PATH: `${tmp}:${process.env.PATH}`,
    };
    delete env.npm_config_http_proxy;
    delete env.npm_config_https_proxy;
    expect(() => {
      execSync("npm run format --prefix backend", { env, stdio: "pipe" });
    }).toThrow(/Playwright CDN/);
  });
});
