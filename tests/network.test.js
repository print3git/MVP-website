const { execSync } = require("child_process");

describe("network connectivity", () => {
  test("npm registry reachable", () => {
    execSync("npm ping", { stdio: "ignore" });
  });

  test("playwright CDN reachable", () => {
    execSync("curl -I -m 10 https://cdn.playwright.dev > /dev/null");
  });
});
