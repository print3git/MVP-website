const { execFileSync } = require("child_process");
const path = require("path");

const binDir = path.join(__dirname, "bin-apt-timeout");

describe("apt-check timeout", () => {
  test("times out when apt-get hangs", () => {
    const env = { ...process.env, PATH: `${binDir}:${process.env.PATH}` };
    expect(() => {
      execFileSync("node", [path.join("scripts", "check-apt.js")], {
        env,
        encoding: "utf8",
      });
    }).toThrow(/apt-get update failed/);
  });
});
