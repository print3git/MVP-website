const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const repoRoot = path.join(__dirname, "..");
const nycrc = path.join(repoRoot, ".nycrc");

function run(cmd, args, env) {
  return execFileSync(cmd, args, {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    encoding: "utf8",
    stdio: "pipe",
  });
}

describe("coverage thresholds", () => {
  let origConfig;
  beforeAll(() => {
    origConfig = fs.readFileSync(nycrc, "utf8");
    const high = {
      checkCoverage: true,
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
      reporter: ["lcov", "text", "json-summary"],
    };
    fs.writeFileSync(nycrc, JSON.stringify(high));
  });
  afterAll(() => {
    fs.writeFileSync(nycrc, origConfig);
    fs.rmSync(path.join(repoRoot, "coverage"), {
      recursive: true,
      force: true,
    });
    fs.rmSync(path.join(repoRoot, "backend", "coverage"), {
      recursive: true,
      force: true,
    });
  });
  test("fails when coverage below threshold", () => {
    run("npm", ["run", "coverage", "--prefix", "backend"], {
      SKIP_PW_DEPS: "1",
      SKIP_NET_CHECKS: "1",
      SKIP_DB_CHECK: "1",
      HF_TOKEN: "t",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      DB_URL: "db",
      STRIPE_SECRET_KEY: "sk",
      CLOUDFRONT_MODEL_DOMAIN: "cdn",
    });
    let err = null;
    try {
      run("node", ["scripts/check-coverage.js"], {});
    } catch (e) {
      err = e;
    }
    expect(err).toBeTruthy();
    expect(err.stdout + err.stderr).toMatch(/Coverage for/);
  });
});
