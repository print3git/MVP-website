const { execFileSync } = require("child_process");
const path = require("path");

const binDir = path.join(__dirname, "bin-apt-install");

describe("apt-check install failure", () => {
  test("fails when apt-get install dry run fails", () => {
    const env = { ...process.env, PATH: `${binDir}:${process.env.PATH}` };
    expect(() => {
      execFileSync("node", [path.join("scripts", "check-apt.js")], {
        env,
        encoding: "utf8",
      });
    }).toThrow(/apt-get install check failed/);
  });
});
