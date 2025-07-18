const fs = require("fs");
const path = require("path");
const glob = require("glob");

// Hook into jest-circus to count executed tests
let executed = 0;
const pkg = require.resolve("jest-circus/package.json");
const { addEventHandler } = require(
  pkg.replace("package.json", "build/state.js"),
);
addEventHandler((event) => {
  if (event.name === "test_fn_success" || event.name === "test_fn_failure") {
    executed += 1;
  }
});

function countTestFiles() {
  const patterns = ["**/*.test.js", "**/*.test.ts", "**/__tests__/**/*.js"];
  const ignore = [
    "**/node_modules/**",
    "**/dist/**",
    "**/.next/**",
    "**/coverage/**",
  ];
  const files = new Set();
  for (const pattern of patterns) {
    for (const file of glob.sync(pattern, { ignore })) {
      files.add(file);
    }
  }
  return files.size;
}

let discovered;

beforeAll(() => {
  discovered = countTestFiles();
});

afterAll(() => {
  console.log(`Discovered ${discovered} test files`);
  console.log(`Executed ${executed} tests`);
  try {
    fs.appendFileSync(
      path.resolve(__dirname, "../../ci-test-audit.log"),
      `files=${discovered} tests=${executed}\n`,
    );
  } catch {
    // ignore errors writing log
  }
  if (discovered < 500) {
    throw new Error(
      `Discovered ${discovered} test files, but expected at least 500. Some tests may not be registered or may be misnamed.`,
    );
  }
  if (executed < 1300) {
    throw new Error(
      `Executed only ${executed} tests; expected ≥ 1300. CI test discovery may be broken.`,
    );
  }
});

test("CI test runner audit", () => {
  expect(discovered).toBeGreaterThanOrEqual(500);
  expect(executed).toBeGreaterThanOrEqual(1300);
});
