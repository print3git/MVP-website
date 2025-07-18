const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const glob = require("glob");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

if (process.env.JEST_SKIP_COVERAGE_INTEGRITY) {
  test.skip("coverage integrity check skipped", () => {});
} else {
  test("all test files and cases executed", () => {
    const repoRoot = path.resolve(__dirname, "..");
    const pattern = path.join("tests", "**", "*.test.@(js|ts)");
    const testFiles = glob.sync(pattern, {
      cwd: repoRoot,
      ignore: ["**/node_modules/**"],
    });

    let definedTests = 0;
    for (const file of testFiles) {
      const src = fs.readFileSync(path.join(repoRoot, file), "utf8");
      const ast = parser.parse(src, {
        sourceType: "unambiguous",
        plugins: ["jsx", "typescript"],
      });
      traverse(ast, {
        CallExpression(p) {
          const c = p.node.callee;
          const isId =
            c.type === "Identifier" && (c.name === "test" || c.name === "it");
          const isMember =
            (c.type === "MemberExpression" ||
              c.type === "OptionalMemberExpression") &&
            c.object.type === "Identifier" &&
            (c.object.name === "test" || c.object.name === "it");
          if (isId || isMember) definedTests += 1;
        },
      });
    }

    const outFile = path.join(os.tmpdir(), "jest-integrity-results.json");
    try {
      execFileSync(
        "node",
        ["scripts/run-jest.js", "--json", `--outputFile=${outFile}`],
        {
          cwd: repoRoot,
          env: { ...process.env, JEST_SKIP_COVERAGE_INTEGRITY: "1" },
          stdio: "ignore",
        },
      );
    } catch (_) {
      // ignore non-zero exit; we only need JSON results
    }

    const data = JSON.parse(fs.readFileSync(outFile, "utf8"));
    const executedFiles = data.testResults.map((r) =>
      path.relative(repoRoot, r.name),
    );
    const executedTests = data.numTotalTests;
    const passedTests = data.numPassedTests;

    console.log(`Discovered test files: ${testFiles.length}`);
    console.log(`Detected test blocks: ${definedTests}`);
    console.log(`Executed tests: ${executedTests}`);
    console.log(`Passed tests: ${passedTests}`);

    const missingFiles = testFiles.filter((f) => !executedFiles.includes(f));
    expect(missingFiles).toEqual([]);
    expect(executedTests).toBe(definedTests);
    expect(executedTests).toBe(passedTests);
  }, 300000);
}
