const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

describe("ci-health script", () => {
  test("reports healthy when env vars set and services reachable", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "curl-"));
    const fakeCurl = path.join(tmp, "curl");
    fs.writeFileSync(fakeCurl, "#!/bin/sh\nexit 0");
    fs.chmodSync(fakeCurl, 0o755);
    const out = execFileSync("node", [path.join("scripts", "ci-health.js")], {
      env: {
        ...process.env,
        PATH: `${tmp}:${process.env.PATH}`,
        DB_URL: "postgres://user:pass@localhost/db",
        STRIPE_SECRET_KEY: "sk_test",
        AWS_ACCESS_KEY_ID: "id",
        AWS_SECRET_ACCESS_KEY: "secret",
        DALLE_SERVER_URL: "https://example.com",
      },
      encoding: "utf8",
    });
    expect(out).toContain("CI environment healthy");
  });

  test("fails when service unreachable", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "curl-"));
    const fakeCurl = path.join(tmp, "curl");
    fs.writeFileSync(fakeCurl, "#!/bin/sh\nexit 7");
    fs.chmodSync(fakeCurl, 0o755);
    expect(() => {
      execFileSync("node", [path.join("scripts", "ci-health.js")], {
        env: {
          ...process.env,
          PATH: `${tmp}:${process.env.PATH}`,
          DB_URL: "postgres://user:pass@localhost/db",
          STRIPE_SECRET_KEY: "sk_test",
          AWS_ACCESS_KEY_ID: "id",
          AWS_SECRET_ACCESS_KEY: "secret",
          DALLE_SERVER_URL: "https://example.com",
        },
        encoding: "utf8",
      });
    }).toThrow(/Service unreachable/);
  });
});
