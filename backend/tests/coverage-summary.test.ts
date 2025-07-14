const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..", "..");

const env = {
  ...process.env,
  HF_TOKEN: "x",
  AWS_ACCESS_KEY_ID: "id",
  AWS_SECRET_ACCESS_KEY: "secret",
  DB_URL: "db",
  STRIPE_SECRET_KEY: "sk",
  SKIP_NET_CHECKS: "1",
  SKIP_PW_DEPS: "1",
};

describe("npm run coverage", () => {
  afterAll(() => {
    fs.rmSync(path.join(repoRoot, "coverage"), { recursive: true, force: true });
    fs.rmSync(path.join(repoRoot, "backend", "coverage"), {
      recursive: true,
      force: true,
    });
  });

  test("produces parsable summary", () => {
    execSync(
      "npm run coverage --silent -- backend/tests/coverage/lcovParse.test.ts",
      { cwd: repoRoot, env },
    );
    const summaryPath = path.join(repoRoot, "backend", "coverage", "coverage-summary.json");
    expect(fs.existsSync(summaryPath)).toBe(true);
    expect(() => JSON.parse(fs.readFileSync(summaryPath, "utf8"))).not.toThrow();
  });
});
