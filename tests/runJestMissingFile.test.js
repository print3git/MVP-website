const { execFileSync } = require("child_process");
const path = require("path");

describe("run-jest missing file", () => {
  test("exits with helpful error", () => {
    const script = path.join("scripts", "run-jest.js");
    const env = {
      ...process.env,
      HF_TOKEN: "test",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      SKIP_NET_CHECKS: "1",
    };
    delete env.npm_config_http_proxy;
    delete env.npm_config_https_proxy;
    expect(() =>
      execFileSync("node", [script, "tests/does-not-exist.test.js"], {
        encoding: "utf8",
        env,
        stdio: "pipe",
      }),
    ).toThrow(/Test file not found/);
  });
});
