const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..", "..");
const script = path.join(repoRoot, "scripts", "setup.sh");

function runSetup() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "home-"));
  fs.writeFileSync(path.join(home, ".bashrc"), "");
  execFileSync("bash", [script], {
    cwd: repoRoot,
    env: {
      ...process.env,
      HOME: home,
      STRIPE_TEST_KEY: "sk_test",
      HF_TOKEN: "t",
      AWS_ACCESS_KEY_ID: "t",
      AWS_SECRET_ACCESS_KEY: "t",
      DB_URL: "postgres://u:p@localhost/db",
      STRIPE_SECRET_KEY: "sk",
      CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
      SKIP_PW_DEPS: "1",
      SKIP_NET_CHECKS: "1",
    },
    stdio: "ignore",
  });
  return fs.readFileSync(path.join(home, ".bashrc"), "utf8");
}

describe("setup script", () => {
  test("persists mise trust command", () => {
    const bashrc = runSetup();
    const escaped = repoRoot.replace(/[-/\\]/g, "\\$&");
    const regex = new RegExp(`mise trust ${escaped}`);
    expect(bashrc).toMatch(regex);
  });
});
