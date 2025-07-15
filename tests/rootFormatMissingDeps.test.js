const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const pluginDir = path.join(
  __dirname,
  "..",
  "node_modules",
  "@babel",
  "plugin-syntax-typescript",
);
const backupDir = pluginDir + ".bak";

function run(env) {
  return execFileSync("npm", ["run", "format"], {
    env,
    stdio: "pipe",
  }).toString();
}

describe("root format missing deps", () => {
  beforeAll(() => {
    if (fs.existsSync(pluginDir)) fs.renameSync(pluginDir, backupDir);
  });

  afterAll(() => {
    if (fs.existsSync(backupDir)) fs.renameSync(backupDir, pluginDir);
  });

  test("installs root dependencies when missing", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "test",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      DB_URL: "postgres://user:pass@localhost/db",
      STRIPE_SECRET_KEY: "sk_test",
      SKIP_NET_CHECKS: "1",
      SKIP_PW_DEPS: "1",
      REAL_NPM: execFileSync("sh", ["-c", "command -v npm"]).toString().trim(),
      PATH: path.join(__dirname, "bin-noop") + ":" + process.env.PATH,
    };
    const output = run(env);
    expect(output).toMatch(/Dependencies missing/);
  });
});
