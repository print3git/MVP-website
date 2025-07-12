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
    const env = {
      ...process.env,
      NETWORK_CHECK_TARGETS: JSON.stringify([
        { url: "http://invalid.invalid", name: "bad" },
      ]),
    };
    expect(() =>
      execFileSync("node", [path.join("scripts", "network-check.js")], { env }),
    ).toThrow();
  });
});
