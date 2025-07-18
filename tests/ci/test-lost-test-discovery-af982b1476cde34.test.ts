/* eslint-disable jsdoc/check-tag-names */
/**
 * @ciOnly
 */
import { execSync } from "child_process";
import glob from "glob";
import fs from "fs";
import path from "path";

const repoRoot = path.resolve(__dirname, "..", "..");

function listAllTests() {
  const patterns = [
    "tests/**/*.test.{js,ts,tsx}",
    "**/__tests__/**/*.{js,ts,tsx}",
    "**/*.test.ts",
    "**/*.test.tsx",
  ];
  const options = {
    cwd: repoRoot,
    ignore: ["**/node_modules/**"],
    absolute: true,
  };
  const files = new Set();
  for (const pattern of patterns) {
    for (const file of glob.sync(pattern, options)) {
      files.add(path.resolve(file));
    }
  }
  return [...files];
}

function listJestTests() {
  const cmd = "node scripts/run-jest.js --listTests tests __tests__ e2e";
  const out = execSync(cmd, { encoding: "utf8" });
  return out
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((f) => path.resolve(f));
}

function listPlaywrightTests() {
  return glob
    .sync("e2e/**/*.test.{js,ts,tsx}", {
      cwd: repoRoot,
      ignore: ["**/node_modules/**"],
      absolute: true,
    })
    .map((f) => path.resolve(f));
}

test("no lost or skipped tests", () => {
  const allTests = listAllTests();
  const knownTests = new Set([...listJestTests(), ...listPlaywrightTests()]);
  const unmatched = allTests.filter((f) => !knownTests.has(f));

  const skippedPattern = /\b(?:it|test|describe)\.skip\(/;
  const skipped = allTests.filter((f) => {
    let text = fs.readFileSync(f, "utf8");
    text = text.replace(/(['"`])(?:\\.|(?!\1).)*\1/g, "");
    text = text.replace(/\/\*[^]*?\*\/|\/\/.*$/gm, "");
    const m = text.match(skippedPattern);
    if (!m) return false;
    const idx = m.index || 0;
    const context = text.slice(Math.max(0, idx - 100), idx);
    if (/process\.env|JEST_SKIP_/i.test(context)) return false;
    const rel = path.relative(repoRoot, f);
    const allow = [
      "backend/tests/frontend/modelViewerFallback.e2e.test.ts",
      "backend/tests/frontend/modelViewerHeadFail.e2e.test.ts",
      "backend/tests/text-to-model-api-call-7c8a9d.test.ts",
      "tests/generated_frontend_b4c9a3e0.test.js",
      "tests/smoke-atomic/viewerReady_i9j0k1l2.test.js",
      "tests/validateEnv.test.js",
    ];
    if (allow.includes(rel)) return false;
    return true;
  });

  const messages = [];
  if (unmatched.length) {
    messages.push(
      "Unmatched tests:\n" +
        unmatched.map((f) => path.relative(repoRoot, f)).join("\n"),
    );
  }
  if (skipped.length) {
    messages.push(
      "Skipped tests:\n" +
        skipped.map((f) => path.relative(repoRoot, f)).join("\n"),
    );
  }
  if (messages.length) {
    throw new Error(messages.join("\n\n"));
  }
});
