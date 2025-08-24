// Utility to detect orphaned Jest test files.
// Can be added to a GitHub Actions job after the test runner for deeper validation.
const fs = require("fs");
const path = require("path");

const TEST_DIRS = ["tests", "__tests__"];
const PATTERNS = [/\.test\.js$/, /\.test\.ts$/, /\.spec\.js$/, /\.spec\.ts$/];

function findTests(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results.push(...findTests(full));
    } else if (PATTERNS.some((r) => r.test(entry))) {
      results.push(path.relative(process.cwd(), full));
    }
  }
  return results;
}

function loadExecuted() {
  const failedPath = path.join("coverage", "failed.log");
  if (fs.existsSync(failedPath)) {
    return new Set(
      fs
        .readFileSync(failedPath, "utf8")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((p) => path.normalize(p)),
    );
  }

  const jsonPath = path.join("coverage", "jest-results.json");
  if (fs.existsSync(jsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      if (Array.isArray(data.testResults)) {
        return new Set(
          data.testResults.map((suite) =>
            path.normalize(path.relative(process.cwd(), suite.name)),
          ),
        );
      }
    } catch {
      // ignore parse errors
    }
  }
  return null;
}

const discovered = new Set();
for (const dir of TEST_DIRS) {
  for (const file of findTests(dir)) {
    discovered.add(path.normalize(file));
  }
}

const executed = loadExecuted();
if (!executed) {
  console.warn("No previous Jest result file found; skipping orphan check.");
  process.exit(0);
}

const orphaned = Array.from(discovered).filter((f) => !executed.has(f));
if (orphaned.length > 0) {
  console.log("Orphaned test files not executed in last run:");
  for (const file of orphaned) {
    console.log("  " + file);
  }
  process.exit(1);
} else {
  console.log("No orphaned test files found.");
}
