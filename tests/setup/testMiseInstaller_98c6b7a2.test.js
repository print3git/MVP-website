const path = require("path");
const https = require("https");
const { spawnSync, execSync } = require("child_process");

function head(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: "HEAD" }, (res) => {
      resolve(res.statusCode || 0);
    });
    req.on("error", reject);
    req.end();
  });
}

jest.setTimeout(20000);

describe("mise installer", () => {
  test("setup.sh installs mise without http 404", async () => {
    let status;
    try {
      status = await head("https://mise.run");
    } catch (err) {
      console.warn("Skipping mise download check:", err.message);
    }
    if (status !== undefined) {
      expect(status).not.toBe(404);
    }

    const basePath = process.env.PATH.split(":")
      .filter((p) => !p.includes("/usr/bin") && !p.endsWith("/bin"))
      .join(":");
    const env = {
      ...process.env,
      HF_TOKEN: "test",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      DB_URL: "postgres://user:pass@localhost/db",
      STRIPE_SECRET_KEY: "sk_test",
      CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
      SKIP_NET_CHECKS: "1",
      SKIP_PW_DEPS: "1",
      REAL_NPM: execSync("command -v npm").toString().trim(),
      REAL_NPX: execSync("command -v npx").toString().trim(),
      PATH:
        path.join(__dirname, "..", "bin-install-mise") +
        ":" +
        path.join(__dirname, "..", "bin-noop-ping") +
        ":" +
        path.join(__dirname, "..", "bin-noop-npx") +
        ":" +
        path.join(__dirname, "..", "bin-noop-sudo") +
        ":" +
        path.join(__dirname, "..", "bin-noop-rm") +
        ":" +
        path.join(__dirname, "..", "path-no-mise") +
        ":" +
        basePath,
    };

    const result = spawnSync("bash", ["scripts/install-mise.sh"], {
      env,
      encoding: "utf8",
      timeout: 20000,
    });

    if (result.error) throw result.error;
    expect(result.status).toBe(0);
    const combined = (result.stdout || "") + (result.stderr || "");
    expect(combined).not.toMatch(/mise installation failed/i);

    const log = result.stdout + (result.stderr || "");
    expect(log).toMatch(/mise installed/);
    expect(log).not.toMatch(/404/);
    expect(log).not.toMatch(/checksum/i);
  });
});
