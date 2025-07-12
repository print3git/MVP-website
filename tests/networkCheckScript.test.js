const { execFileSync } = require("child_process");
const path = require("path");

describe("network-check script", () => {
  test("reports network OK", () => {
    const out = execFileSync(
      "node",
      [path.join("scripts", "network-check.js")],
      { encoding: "utf8" },
    );
    expect(out).toContain("✅ network OK");
  });

  test("fails when a target is unreachable", () => {
    const env = {
      ...process.env,
      PLAYWRIGHT_CDN_URL: "http://192.0.2.1",
      NETWORK_CHECK_TIMEOUT: "1",
    };
    expect(() =>
      execFileSync("node", [path.join("scripts", "network-check.js")], {
        env,
        encoding: "utf8",
      }),
    ).toThrow();
  });
});
