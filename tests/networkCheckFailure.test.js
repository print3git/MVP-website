const { execFileSync } = require("child_process");
const path = require("path");

const fakeBin = path.join(__dirname, "bin");
const env = { ...process.env, PATH: `${fakeBin}:${process.env.PATH}` };

describe("network-check failure", () => {
  test("reports useful error when unreachable", () => {
    expect(() => {
      execFileSync("node", [path.join("scripts", "network-check.js")], {
        env,
        encoding: "utf8",
        stdio: "pipe",
      });
    }).toThrow(/Unable to reach npm registry/);
  });
});
