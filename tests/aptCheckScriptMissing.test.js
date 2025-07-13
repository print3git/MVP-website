const { execFileSync } = require("child_process");
const path = require("path");

const binDir = path.join(__dirname, "bin-noapt");

/** Simulate missing apt-get by overriding PATH */

describe("apt-check script missing apt-get", () => {
  test("skips gracefully when apt-get is missing", () => {
    const nodeDir = path.dirname(process.execPath);
    const env = { ...process.env, PATH: `${binDir}:${nodeDir}` };
    const output = execFileSync(
      "node",
      [path.join("scripts", "check-apt.js")],
      {
        env,
        encoding: "utf8",
      },
    );
    expect(output).toMatch(/apt-get not found/);
  });
});
