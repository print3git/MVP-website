import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

const script = path.resolve(
  __dirname,
  "../../../scripts/ci-guard/pnpm-bootstrap/audit.ts",
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

describe("pnpm bootstrap audit", () => {
  test("setup-node + corepack + pnpm/action-setup present → pass", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t1-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@8.0.0" }),
    );
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t1\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          cache: pnpm\n          cache-dependency-path: pnpm-lock.yaml\n      - run: corepack enable\n      - uses: pnpm/action-setup@v3\n        with:\n          run_install: false\n      - run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("pnpm used without corepack → fail", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t2-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@8.0.0" }),
    );
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t2\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          cache: pnpm\n          cache-dependency-path: pnpm-lock.yaml\n      - run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/corepack/);
  });

  test("pnpm used with npm cache → fail", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t3-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@8.0.0" }),
    );
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t3\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          cache: npm\n      - run: corepack enable\n      - run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/cache: npm/);
  });

  test("pnpm used but no setup-node → fail", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t4-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@8.0.0" }),
    );
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t4\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - run: corepack enable\n      - run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/setup-node/);
  });

  test("workspace: frontend working-directory respected → pass", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t5-"));
    writeFile(tmp, "package.json", "{}");
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      "frontend/package.json",
      JSON.stringify({ packageManager: "pnpm@8.0.0" }),
    );
    writeFile(tmp, "frontend/pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t5\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          cache: pnpm\n          cache-dependency-path: |\n            pnpm-lock.yaml\n            frontend/pnpm-lock.yaml\n      - run: corepack enable\n      - run: pnpm install\n        working-directory: frontend\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("multiple pnpm-lock.yaml in paths → cache-dependency-path lists both → pass", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t6-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@8.0.0" }),
    );
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(tmp, "frontend/pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t6\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          cache: pnpm\n          cache-dependency-path: |\n            pnpm-lock.yaml\n            frontend/pnpm-lock.yaml\n      - run: corepack enable\n      - run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("action-setup present, run_install:false respected → pass", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t7-"));
    writeFile(tmp, "package.json", JSON.stringify({}));
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t7\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          cache: pnpm\n          cache-dependency-path: pnpm-lock.yaml\n      - run: corepack enable\n      - uses: pnpm/action-setup@v3\n        with:\n          run_install: false\n      - run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("wrong order (pnpm before setup-node) → fail", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t8-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@8.0.0" }),
    );
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t8\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - run: pnpm install\n      - uses: actions/setup-node@v4\n        with:\n          cache: pnpm\n          cache-dependency-path: pnpm-lock.yaml\n      - run: corepack enable\n`,
    );
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/setup-node/);
  });

  test("step names arbitrary but content matches → pass", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t9-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@8.0.0" }),
    );
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t9\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - name: foo\n        uses: actions/setup-node@v4\n        with:\n          cache: pnpm\n          cache-dependency-path: pnpm-lock.yaml\n      - name: bar\n        run: corepack enable\n      - name: baz\n        run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("npm-only projects ignored → pass", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t10-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "npm@9.0.0" }),
    );
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t10\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          cache: npm\n      - run: npm install\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("packageManager mismatch (package.json says pnpm but workflows only npm) → fail", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t11-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@8.0.0" }),
    );
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t11\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          cache: npm\n      - run: npm install\n`,
    );
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/pins pnpm/);
  });

  test("summary correctly aggregates multiple offending files", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t12-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@8.0.0" }),
    );
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t12a\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - run: pnpm install\n`,
    );
    writeFile(
      tmp,
      ".github/workflows/b.yml",
      `name: t12b\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/a.yml/);
    expect(res.stderr + res.stdout).toMatch(/b.yml/);
  });
});
