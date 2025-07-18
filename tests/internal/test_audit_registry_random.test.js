const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const glob = require("glob");

if (process.env.JEST_SKIP_AUDIT) {
  test.skip("audit registry skipped", () => {});
} else {
  test("all tests executed", () => {
    const files = glob.sync("**/*.test.{js,ts}", {
      ignore: ["**/node_modules/**"],
    });
    console.log("Discovered test files:", files.length);
    expect(files.length).toBeGreaterThanOrEqual(1000);

    const outFile = path.join(os.tmpdir(), "jest-audit-results.json");
    try {
      execFileSync(
        "node",
        ["scripts/run-jest.js", "--json", `--outputFile=${outFile}`],
        {
          env: { ...process.env, JEST_SKIP_AUDIT: "1" },
          stdio: "ignore",
        },
      );
    } catch (_err) {
      // ignore non-zero exit since we only care about json output
    }
    const data = JSON.parse(fs.readFileSync(outFile, "utf8"));
    const testCount = data.numTotalTests;
    console.log("Executed test cases:", testCount);
    expect(testCount).toBeGreaterThanOrEqual(3000);
  }, 300000);
}
