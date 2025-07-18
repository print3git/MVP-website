import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import glob from "glob";

test("all tests executed in coverage run", () => {
  const repoRoot = path.resolve(__dirname, "..");
  const testFiles = glob.sync("tests/**/*.test.{js,ts}", {
    cwd: repoRoot,
    absolute: true,
  });

  const outFile = path.join(os.tmpdir(), `jest-cover-${Date.now()}.json`);
  execFileSync(
    "node",
    ["scripts/run-jest.js", "--coverage", "--json", `--outputFile=${outFile}`],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        SKIP_NET_CHECKS: "1",
        SKIP_PW_DEPS: "1",
        AWS_ACCESS_KEY_ID: "id",
        AWS_SECRET_ACCESS_KEY: "secret",
        DB_URL: "db",
        STRIPE_SECRET_KEY: "sk",
      },
      stdio: "ignore",
    },
  );

  const data = JSON.parse(fs.readFileSync(outFile, "utf8"));
  const executed = new Set(data.testResults.map((t) => path.resolve(t.name)));
  const missed = testFiles.filter((f) => !executed.has(f));
  expect(missed).toEqual([]);
});
