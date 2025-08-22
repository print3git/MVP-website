import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

const script = path.resolve(
  __dirname,
  "../../../scripts/ci-guard/windows-cancel-guard/audit.ts",
);
const tsNode = [
  "-y",
  "ts-node",
  "--transpile-only",
  "--compiler-options",
  JSON.stringify({ module: "commonjs", moduleResolution: "node" }),
  script,
];

function run(cwd: string) {
  return spawnSync("npx", tsNode, { cwd, encoding: "utf8" });
}

function writeFile(dir: string, file: string, content: string) {
  const full = path.join(dir, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

describe("windows cancel guard", () => {
  test("t1 Windows job with full bootstrap → pass", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t1-"));
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t1\njobs:\n  build:\n    runs-on: windows-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n          cache-dependency-path: pnpm-lock.yaml\n      - run: corepack enable\n      - uses: pnpm/action-setup@v3\n        with:\n          run_install: false\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("t2 Windows job missing corepack → fail", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t2-"));
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t2\njobs:\n  build:\n    runs-on: windows-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n          cache-dependency-path: pnpm-lock.yaml\n      - uses: pnpm/action-setup@v3\n        with:\n          run_install: false\n`,
    );
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/corepack/);
  });

  test("t3 Windows job missing pnpm fallback → fail", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t3-"));
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t3\njobs:\n  build:\n    runs-on: windows-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n          cache-dependency-path: pnpm-lock.yaml\n      - run: corepack enable\n`,
    );
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/pnpm\/action-setup/);
  });

  test("t4 Matrix Windows+Linux with fail-fast:false → pass", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t4-"));
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t4\njobs:\n  build-test:\n    runs-on: \${{ matrix.os }}\n    strategy:\n      fail-fast: false\n      matrix:\n        os: [ubuntu-latest, windows-latest]\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n          cache-dependency-path: pnpm-lock.yaml\n      - run: corepack enable\n      - uses: pnpm/action-setup@v3\n        with:\n          run_install: false\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("t5 Matrix default fail-fast (true) and independent lanes → fail", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t5-"));
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t5\njobs:\n  build-test:\n    runs-on: \${{ matrix.os }}\n    strategy:\n      matrix:\n        os: [ubuntu-latest, windows-latest]\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n          cache-dependency-path: pnpm-lock.yaml\n      - run: corepack enable\n      - uses: pnpm/action-setup@v3\n        with:\n          run_install: false\n`,
    );
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/fail-fast/);
  });

  test("t6 Summary job missing if: always() → fail", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t6-"));
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t6\njobs:\n  summary:\n    runs-on: ubuntu-latest\n    steps: []\n`,
    );
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/always\(\)/);
  });

  test("t7 Non-Windows jobs ignored for fail-fast rule → pass", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t7-"));
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t7\njobs:\n  test:\n    runs-on: \${{ matrix.os }}\n    strategy:\n      matrix:\n        os: [ubuntu-latest, macos-latest]\n    steps: []\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("t8 Windows job using bash instead of pwsh for corepack (warn) → pass", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t8-"));
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t8\njobs:\n  build:\n    runs-on: windows-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n          cache-dependency-path: pnpm-lock.yaml\n      - run: corepack enable\n        shell: bash\n      - uses: pnpm/action-setup@v3\n        with:\n          run_install: false\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
    expect(res.stderr + res.stdout).toMatch(/pwsh/);
  });

  test("t9 cache-dependency-path includes pnpm-lock.yaml → pass", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t9-"));
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t9\njobs:\n  build:\n    runs-on: windows-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n          cache-dependency-path: pnpm-lock.yaml\n      - run: corepack enable\n      - uses: pnpm/action-setup@v3\n        with:\n          run_install: false\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("t9b cache-dependency-path missing → warn", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t9b-"));
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t9b\njobs:\n  build:\n    runs-on: windows-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n      - run: corepack enable\n      - uses: pnpm/action-setup@v3\n        with:\n          run_install: false\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
    expect(res.stderr + res.stdout).toMatch(/cache-dependency-path/);
  });

  test("t10 Job-level cancellation probe step present → pass", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t10-"));
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t10\njobs:\n  build:\n    runs-on: windows-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n          cache-dependency-path: pnpm-lock.yaml\n      - run: corepack enable\n      - run: echo probe\n      - uses: pnpm/action-setup@v3\n        with:\n          run_install: false\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("t11 macOS ARM job unaffected by Windows rules → pass", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t11-"));
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t11\njobs:\n  mac:\n    runs-on: macos-14\n    steps: []\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("t12 Aggregated output lists file+job pointers and remediation", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t12-"));
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t12a\njobs:\n  build:\n    runs-on: windows-latest\n    steps: []\n`,
    );
    writeFile(
      tmp,
      ".github/workflows/b.yml",
      `name: t12b\njobs:\n  build:\n    runs-on: windows-latest\n    steps: []\n`,
    );
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/a.yml/);
    expect(res.stderr + res.stdout).toMatch(/b.yml/);
  });
});
