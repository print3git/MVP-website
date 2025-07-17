const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const script = path.join(__dirname, "..", "scripts", "test-full-pipeline.js");

describe("test-full-pipeline script", () => {
  test("skips when SKIP_DB_CHECK=1", () => {
    const env = {
      ...process.env,
      SKIP_DB_CHECK: "1",
      SPARC3D_ENDPOINT: "http://test",
      HF_API_KEY: "1",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      S3_BUCKET_NAME: "bucket",
      CLOUDFRONT_MODEL_DOMAIN: "domain",
    };
    const output = execFileSync("node", [script], { encoding: "utf8", env });
    expect(output).toMatch(/Skipping \/api\/generate test/);
  });

  test("includes skip logic", () => {
    const content = fs.readFileSync(script, "utf8");
    expect(content).toMatch(/SKIP_DB_CHECK/);
  });

  test("fails when required env var missing", () => {
    const env = {
      ...process.env,
      SPARC3D_ENDPOINT: "http://test",
      HF_API_KEY: "",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      S3_BUCKET_NAME: "bucket",
      CLOUDFRONT_MODEL_DOMAIN: "domain",
    };
    try {
      execFileSync("node", [script], { encoding: "utf8", env });
    } catch (err) {
      const output = (err.stdout || "") + (err.stderr || "");
      expect(output).toMatch(/Missing required env var: HF_API_KEY/);
      return;
    }
    throw new Error("script should have failed");
  });

  test("skips when DB_URL is placeholder", () => {
    const env = {
      ...process.env,
      SPARC3D_ENDPOINT: "http://test",
      HF_API_KEY: "1",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      S3_BUCKET_NAME: "bucket",
      CLOUDFRONT_MODEL_DOMAIN: "domain",
      DB_URL: "postgres://user:password@localhost:5432/your_database",
    };
    const output = execFileSync("node", [script], { encoding: "utf8", env });
    expect(output).toMatch(/Skipping \/api\/generate test due to SKIP_DB_CHECK/);
  });
});
