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

  test("fails when target unreachable", () => {
    expect(() => {
      execFileSync("node", [path.join("scripts", "network-check.js")], {
        encoding: "utf8",
        env: { ...process.env, NETWORK_CHECK_URL: "http://127.0.0.1:9" },
      });
    }).toThrow(/Unable to reach/);
  });
});
