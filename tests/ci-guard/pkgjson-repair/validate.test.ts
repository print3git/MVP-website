const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const script = path.resolve(
  __dirname,
  "../../../scripts/ci-guard/pkgjson-repair/validate.ts",
);
const fixtures = path.resolve(__dirname, "fixtures");

function runFixture(name, extraSetup, content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pkg-"));
  if (content) {
    fs.writeFileSync(path.join(dir, "package.json"), content);
  } else {
    const src = fs.readFileSync(path.join(fixtures, name));
    fs.writeFileSync(path.join(dir, "package.json"), src);
  }
  if (extraSetup) extraSetup(dir);
  return spawnSync("node", [script], { cwd: dir, encoding: "utf8" });
}

describe("pkgjson validator", () => {
  test("t1 valid minimal package.json", () => {
    const res = runFixture("valid.json");
    expect(res.status).toBe(0);
  });

  test("t2 trailing comma in scripts reports location", () => {
    const res = runFixture("trailing-comma.json");
    expect(res.status).toBe(1);
    expect(res.stderr || res.stdout).toMatch(/JSON parse error at \d+:\d+/);
  });

  test("t3 truncated file yields parse error", () => {
    const res = runFixture("truncated.json");
    expect(res.status).toBe(1);
    expect(res.stderr + res.stdout).toMatch(/JSON parse error/);
  });

  test("t4 name not a string fails schema", () => {
    const res = runFixture("bad-types.json");
    expect(res.status).toBe(1);
    expect(res.stderr + res.stdout).toMatch(
      /missing required string field "name"/,
    );
  });

  test("t5 private not boolean fails schema", () => {
    const res = runFixture("bad-types.json");
    expect(res.status).toBe(1);
    expect(res.stderr + res.stdout).toMatch(
      /missing required boolean field "private"/,
    );
  });

  test("t6 workspaces wrong type fails schema", () => {
    const res = runFixture("bad-types.json");
    expect(res.status).toBe(1);
    expect(res.stderr + res.stdout).toMatch(
      /optional field "workspaces" must be array of strings/,
    );
  });

  test("t7 packageManager with pnpm version passes", () => {
    const res = runFixture("package-manager.json");
    expect(res.status).toBe(0);
  });

  test("t8 missing script referenced in workflows warns", () => {
    const res = runFixture("valid.json", (dir) => {
      const wfDir = path.join(dir, ".github", "workflows");
      fs.mkdirSync(wfDir, { recursive: true });
      fs.writeFileSync(path.join(wfDir, "w.yml"), "run: pnpm run format:check");
    });
    expect(res.status).toBe(0);
    expect(res.stderr + res.stdout).toMatch(
      /Missing scripts referenced in workflows: format:check/,
    );
  });

  test("t9 file with BOM parses", () => {
    const res = runFixture("bom.json");
    expect(res.status).toBe(0);
  });

  test("t10 CRLF line endings parse", () => {
    const res = runFixture("crlf.json");
    expect(res.status).toBe(0);
  });

  test("t11 extra unknown keys allowed", () => {
    const res = runFixture("extra-keys.json");
    expect(res.status).toBe(0);
  });

  test("t12 corrupt UTF-8 yields readable error", () => {
    const invalid = Buffer.from('{ "name": "x" }\xc3\x28', "binary");
    const res = runFixture(null, null, invalid);
    expect(res.status).toBe(1);
    expect(res.stderr + res.stdout).toMatch(/Unexpected/);
  });
});
