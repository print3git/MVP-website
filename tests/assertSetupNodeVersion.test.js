const { spawnSync } = require("child_process");
const path = require("path");

describe("assert-setup node version check", () => {
  test("fails with helpful message when node too old", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "x",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      SKIP_NET_CHECKS: "1",
    };
    const node18 = path.join(
      process.env.HOME,
      ".local/share/mise/installs/node/18.20.8/bin/node",
    );
    const result = spawnSync(
      node18,
      [path.resolve(__dirname, "../scripts/assert-setup.js")],
      {
        env,
        encoding: "utf8",
      },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Run 'mise env node@20' and retry.");
  });
});
