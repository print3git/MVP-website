/**
 * Basic connectivity checks to external resources used by setup.
 */
const https = require("https");

/**
 * Perform a simple GET request to verify network access.
 * @param {string} url target URL
 * @returns {Promise<boolean>} resolves true if status < 500
 */
function check(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 5000 }, (res) => {
      res.resume();
      resolve(res.statusCode < 500);
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

describe("network connectivity", () => {
  test("npm registry reachable", async () => {
    const ok = await check("https://registry.npmjs.org/-/ping").catch((err) => {
      throw new Error(`npm registry unreachable: ${err.message}`);
    });
    expect(ok).toBe(true);
  });

  test("Playwright CDN reachable", async () => {
    const ok = await check("https://cdn.playwright.dev").catch((err) => {
      throw new Error(`Playwright CDN unreachable: ${err.message}`);
    });
    expect(ok).toBe(true);
  });
});
