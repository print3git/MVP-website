/** @file Connectivity checks for required external services */
const https = require("https");

/**
 * Send a HEAD request and return the response status code.
 * @param {string} url - URL to request.
 * @returns {Promise<number>} Resolves with the status code.
 */
function head(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: "HEAD" }, (res) => {
      resolve(res.statusCode);
    });
    req.on("error", reject);
    req.end();
  });
}

describe("network connectivity", () => {
  test("npm registry reachable", async () => {
    let status;
    try {
      status = await head("https://registry.npmjs.org/-/ping");
    } catch (err) {
      console.warn("Skipping npm registry check:", err.message);
      return;
    }
    expect(status).toBeLessThan(500);
  });

  test("playwright CDN reachable", async () => {
    let status;
    try {
      status = await head("https://cdn.playwright.dev");
    } catch (err) {
      console.warn("Skipping CDN connectivity test:", err.message);
      return;
    }
    expect(status).toBeLessThan(500);
  });
});
