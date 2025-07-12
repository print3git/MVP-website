const { execFileSync } = require("child_process");
const path = require("path");

describe("apt-check script", () => {
  test("skips when SKIP_PW_DEPS=1", () => {
    const out = execFileSync("node", [path.join("scripts", "check-apt.js")], {
      env: { ...process.env, SKIP_PW_DEPS: "1" },
      encoding: "utf8",
    });
    expect(out).toContain("Skipping apt check");
  });
});
