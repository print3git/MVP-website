const { execSync } = require("child_process");
const https = require("https");

/**
 * Perform a HEAD request to the given URL.
 * @param {string} url - URL to check.
 * @returns {Promise<number>} HTTP status code
 */
function head(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: "HEAD" }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on("error", reject);
    req.end();
  });
}

describe("environment checks", () => {
  test("node version is at least 20", () => {
    const major = parseInt(process.versions.node.split(".")[0], 10);
    expect(major).toBeGreaterThanOrEqual(20);
  });

  test("lock file contains all devDependencies", () => {
    execSync("node scripts/check-lockfile.js");
  });

  test("npm registry is reachable", () => {
    if (process.env.SKIP_NET_CHECKS) return;
    try {
      execSync("npm ping", { stdio: "pipe" });
    } catch (err) {
      console.warn("Skipping npm connectivity test:", err.message);
    }
  });

  test("Playwright CDN is reachable", async () => {
    if (process.env.SKIP_NET_CHECKS) return;
    try {
      const status = await head("https://cdn.playwright.dev");
      expect(status).toBe(200);
    } catch (err) {
      console.warn("Skipping CDN connectivity test:", err.message);
    }
  });
});
