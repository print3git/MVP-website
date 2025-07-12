const { execFileSync } = require("child_process");
const path = require("path");

const binDir = path.join(__dirname, "bin-apt");

describe("apt-check script failure", () => {
  test("fails when apt-get returns error", () => {
    const env = { ...process.env, PATH: `${binDir}:${process.env.PATH}` };
    expect(() => {
      execFileSync("node", [path.join("scripts", "check-apt.js")], {
        env,
        encoding: "utf8",
      });
    }).toThrow(/apt-get update failed/);
  });
});
