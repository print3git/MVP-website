const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const script = path.join(__dirname, "..", "scripts", "run-migrations.js");
const logFile = path.join(__dirname, "..", "pg-mock.log");

const env = {
  ...process.env,
  NODE_OPTIONS: `--require ${path.resolve(__dirname, "stubPg.js")}`,
  PG_MOCK_LOG: logFile,
  DB_URL: "postgres://user:pass@localhost/db",
};

afterEach(() => {
  if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
});

test("migrations run without errors in dry-run mode", () => {
  const result = spawnSync(process.execPath, [script], { env });
  expect(result.status).toBe(0);
  const queries = JSON.parse(fs.readFileSync(logFile, "utf8"));
  const migrationDir = path.join(__dirname, "..", "migrations");
  const files = fs
    .readdirSync(migrationDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const contents = files.map((f) =>
    fs.readFileSync(path.join(migrationDir, f), "utf8"),
  );
  expect(queries).toEqual(contents);
});
