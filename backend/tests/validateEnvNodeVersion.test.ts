const { execFileSync } = require("child_process");
const path = require("path");

describe("validate-env node version check", () => {
  test("fails when node version too low", () => {
    const major = parseInt(process.versions.node.split(".")[0], 10);
    const env = {
      ...process.env,
      REQUIRED_NODE_MAJOR: String(major + 5),
      HF_TOKEN: "x",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      DB_URL: "db",
      STRIPE_SECRET_KEY: "sk",
      SKIP_NET_CHECKS: "1",
      SKIP_PW_DEPS: "1",
    };
    expect(() => {
      execFileSync(
        "bash",
        [path.join(__dirname, "..", "..", "scripts", "validate-env.sh")],
        { env, encoding: "utf8" },
      );
    }).toThrow(new RegExp(`Node ${major + 5}`));
  });
});
