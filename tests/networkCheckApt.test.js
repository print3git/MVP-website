const { execFileSync } = require("child_process");
const path = require("path");

describe("network-check apt", () => {
  test("fails when apt archive unreachable", () => {
    expect(() => {
      execFileSync("node", [path.join("scripts", "network-check.js")], {
        encoding: "utf8",
        env: { ...process.env, APT_CHECK_URL: "http://127.0.0.1:9" },
      });
    }).toThrow(/Unable to reach/);
  });
});
