const { spawnSync } = require("child_process");
const https = require("https");
const path = require("path");

/**
 * Make a HEAD request and return the status code.
 * @param url
 */
function head(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: "HEAD" }, (res) => {
      res.resume();
      resolve(res.statusCode || 0);
    });
    req.on("error", reject);
    req.end();
  });
}

function ensureMise() {
  const check = spawnSync("mise", ["--version"], { encoding: "utf8" });
  if (check.error || check.status !== 0) {
    const install = spawnSync(
      "bash",
      [path.join("scripts", "install-mise.sh")],
      {
        encoding: "utf8",
      },
    );
    if (install.status !== 0) {
      throw new Error(
        `mise install failed\n${install.stdout}${install.stderr}`,
      );
    }
  }
}

async function checkUrls() {
  const urls = [
    "https://registry.npmjs.org/-/ping",
    ...(process.env.SKIP_PW_DEPS
      ? []
      : ["https://cdn.playwright.dev/browser.json"]),
  ];
  if (process.env.PLAYWRIGHT_BASE_URL) {
    urls.push(process.env.PLAYWRIGHT_BASE_URL);
  }
  for (const url of urls) {
    const status = await head(url);
    if (status >= 400) {
      if (url.includes("cdn.playwright.dev")) continue; // tolerate CDN 4xx in CI
      throw new Error(`URL unreachable (${status}): ${url}`);
    }
  }
}

function checkEnv() {
  const placeholders = {
    AWS_ACCESS_KEY_ID: "your-aws-access-key-id",
    AWS_SECRET_ACCESS_KEY: "your-aws-secret-access-key",
    DB_URL: "postgres://user:password@localhost:5432/your_database",
    STRIPE_SECRET_KEY: "sk_test_...",
    STRIPE_WEBHOOK_SECRET: "whsec_...",
  };
  const missing = [];
  for (const [name, placeholder] of Object.entries(placeholders)) {
    const val = process.env[name];
    if (!val) {
      missing.push(`${name} is not set`);
    } else if (val === placeholder) {
      missing.push(`${name} uses placeholder value`);
    }
  }
  if (missing.length) {
    throw new Error(missing.join("; "));
  }
}

const skip = !process.env.CI;
const testFn = skip ? it.skip : it;

testFn("diagnostic env validation", async () => {
  try {
    ensureMise();
    await checkUrls();
    checkEnv();
  } catch (err) {
    console.error(err.message || err);
    throw err;
  }
});
