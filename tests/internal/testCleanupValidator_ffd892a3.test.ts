import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

/**
 * Ensures that running an individual test does not leave behind temporary files
 * or modify a dummy database file. The dummy test (tests/dummy.test.js) should
 * be idempotent and make no changes to the provided TMPDIR or DB path.
 */
describe("cleanup validator", () => {
  const repoRoot = path.resolve(__dirname, "../..");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cleanup-"));
  const dbPath = path.join(tempDir, "dummy-db.json");
  let initialFiles;
  let initialDb;

  beforeAll(() => {
    fs.writeFileSync(dbPath, JSON.stringify({ rows: [] }));
    initialFiles = fs.readdirSync(tempDir).sort();
    initialDb = fs.readFileSync(dbPath, "utf8");
  });

  test("dummy test leaves no residue", () => {
    execFileSync("node", ["scripts/run-jest.js", "tests/dummy.test.js"], {
      cwd: repoRoot,
      env: { ...process.env, TMPDIR: tempDir, DUMMY_DB_PATH: dbPath },
      stdio: "inherit",
    });

    const afterFiles = fs.readdirSync(tempDir).sort();
    expect(afterFiles).toEqual(initialFiles);

    const afterDb = fs.readFileSync(dbPath, "utf8");
    expect(afterDb).toBe(initialDb);
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
