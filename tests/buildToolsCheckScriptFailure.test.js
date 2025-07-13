const { execFileSync } = require("child_process");
const path = require("path");

describe("build-tools check failure", () => {
  test("exits when required packages missing", () => {
    const binDir = path.join(__dirname, "bin-dpkg");
    expect(() => {
      execFileSync("node", [path.join("scripts", "check-build-tools.js")], {
        env: { ...process.env, PATH: `${binDir}:${process.env.PATH}` },
        encoding: "utf8",
      });
    }).toThrow(/Missing build tools/);
  });
});
