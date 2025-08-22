import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

const script = path.resolve(
  __dirname,
  "../../../scripts/ci-guard/corepack-pnpm-path/audit.ts",
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

describe("corepack pnpm path audit", () => {
  test("t1: Proper bootstrap → pass", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t1-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@8.0.0" }),
    );
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `jobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: corepack enable\n      - uses: pnpm/action-setup@v3\n        with:\n          version: 8.0.0\n      - run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
  });
  test("t2: pnpm command without corepack enable → fail", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t2-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@8.0.0" }),
    );
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `jobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/corepack enable/);
  });
  test("t3: cache:'npm' with pnpm usage → fail", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t3-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@8.0.0" }),
    );
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `jobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: npm\n      - run: corepack enable\n      - run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/cache: npm/);
  });
  test("t4: conflicting pnpm/action-setup version → fail", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t4-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@8.0.0" }),
    );
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `jobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: corepack enable\n      - uses: pnpm/action-setup@v3\n        with:\n          version: 7.0.0\n      - run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/conflicts with packageManager/);
  });
  test("t5: corepack prepare uses packageManager → pass", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t5-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@8.0.0" }),
    );
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `jobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: corepack enable\n      - run: corepack prepare pnpm@8.0.0 --activate\n      - run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
  });
  test("t6: macOS ARM workflow with bootstrap → pass", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t6-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@8.0.0" }),
    );
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `jobs:\n  build:\n    runs-on: macos-14\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: corepack enable\n      - uses: pnpm/action-setup@v3\n        with:\n          version: 8.0.0\n      - run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
  });
  test("t7: Linux x64 with bootstrap → pass", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t7-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@8.0.0" }),
    );
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `jobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: corepack enable\n      - uses: pnpm/action-setup@v3\n        with:\n          version: 8.0.0\n      - run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
  });
  test("t8: multiple workspaces with cache-dependency-path → pass", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t8-"));
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
      `jobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n          cache-dependency-path: |\n            pnpm-lock.yaml\n            frontend/pnpm-lock.yaml\n      - run: corepack enable\n      - uses: pnpm/action-setup@v3\n        with:\n          version: 8.0.0\n      - run: pnpm install\n        working-directory: frontend\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
  });
  test("t9: missing verify step allowed → pass", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t9-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@8.0.0" }),
    );
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `jobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: corepack enable\n      - uses: pnpm/action-setup@v3\n        with:\n          version: 8.0.0\n      - run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
  });
  test("t10: npm-only workflow ignored → pass", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t10-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "npm@9.0.0" }),
    );
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `jobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: npm\n      - run: npm install\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
  });
  test("t11: packageManager missing but fallback ensures pnpm → pass", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t11-"));
    writeFile(tmp, "package.json", "{}");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `jobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: corepack enable\n      - uses: pnpm/action-setup@v3\n      - run: pnpm --version\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
  });
  test("t12: aggregated report lists all offenders", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t12-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@8.0.0" }),
    );
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `jobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - run: pnpm install\n`,
    );
    writeFile(
      tmp,
      ".github/workflows/b.yml",
      `jobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/a.yml/);
    expect(res.stderr + res.stdout).toMatch(/b.yml/);
  });
});
