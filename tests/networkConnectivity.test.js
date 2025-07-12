const { execSync } = require("child_process");

describe("network connectivity", () => {
  test("npm registry is reachable", () => {
    expect(() => execSync("npm ping", { stdio: "pipe" })).not.toThrow();
  });

  test("Playwright CDN is reachable", () => {
    expect(() =>
      execSync("curl -I https://cdn.playwright.dev --max-time 10", {
        stdio: "pipe",
      }),
    ).not.toThrow();
  });
});
