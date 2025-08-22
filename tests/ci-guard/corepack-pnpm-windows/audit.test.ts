import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

const script = path.resolve(
  __dirname,
  "../../../scripts/ci-guard/corepack-pnpm-windows/audit.ts",
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

describe("corepack pnpm windows audit", () => {
  test("t1 windows job with full bootstrap passes", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t1-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@10.11.0" }),
    );
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t1\njobs:\n  build:\n    runs-on: windows-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n          cache-dependency-path: pnpm-lock.yaml\n      - run: corepack enable\n        shell: pwsh\n      - run: corepack prepare pnpm@10.11.0 --activate\n      - run: pnpm --version\n        shell: pwsh\n      - run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("t2 missing corepack enable fails", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t2-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@10.11.0" }),
    );
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t2\njobs:\n  build:\n    runs-on: windows-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n          cache-dependency-path: pnpm-lock.yaml\n      - run: corepack prepare pnpm@10.11.0 --activate\n      - run: pnpm --version\n      - run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/corepack enable/);
  });

  test("t3 missing prepare and fallback fails", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t3-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@10.11.0" }),
    );
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t3\njobs:\n  build:\n    runs-on: windows-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n          cache-dependency-path: pnpm-lock.yaml\n      - run: corepack enable\n      - run: pnpm --version\n      - run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/corepack prepare/);
  });

  test("t4 pnpm used before verify fails", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t4-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@10.11.0" }),
    );
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t4\njobs:\n  build:\n    runs-on: windows-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n          cache-dependency-path: pnpm-lock.yaml\n      - run: corepack enable\n      - run: corepack prepare pnpm@10.11.0 --activate\n      - run: pnpm install\n      - run: pnpm --version\n`,
    );
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/pnpm --version/);
  });

  test("t5 cache npm present fails", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t5-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@10.11.0" }),
    );
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t5\njobs:\n  build:\n    runs-on: windows-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: npm\n      - run: corepack enable\n      - run: corepack prepare pnpm@10.11.0 --activate\n      - run: pnpm --version\n      - run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/cache: npm/);
  });

  test("t6 packageManager pin mismatch fails", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t6-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@10.11.0" }),
    );
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t6\njobs:\n  build:\n    runs-on: windows-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n          cache-dependency-path: pnpm-lock.yaml\n      - run: corepack enable\n      - run: corepack prepare pnpm@9.9.0 --activate\n      - run: pnpm --version\n      - run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/pnpm version 9.9.0/);
  });

  test("t7 non-windows jobs unaffected", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t7-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@10.11.0" }),
    );
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t7\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("t8 multiple lockfiles allowed", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t8-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@10.11.0" }),
    );
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(tmp, "frontend/pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t8\njobs:\n  build:\n    runs-on: windows-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n          cache-dependency-path: |\n            pnpm-lock.yaml\n            frontend/pnpm-lock.yaml\n      - run: corepack enable\n      - run: corepack prepare pnpm@10.11.0 --activate\n      - run: pnpm --version\n      - run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("t9 matrix windows + ubuntu passes", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t9-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@10.11.0" }),
    );
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t9\njobs:\n  build:\n    runs-on: ${"${{ matrix.os }}"}\n    strategy:\n      fail-fast: false\n      matrix:\n        os: [ubuntu-latest, windows-latest]\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n          cache-dependency-path: pnpm-lock.yaml\n      - run: corepack enable\n        if: startsWith(runner.os, 'Windows')\n        shell: pwsh\n      - run: corepack prepare pnpm@10.11.0 --activate\n        if: startsWith(runner.os, 'Windows')\n      - run: pnpm --version\n        if: startsWith(runner.os, 'Windows')\n        shell: pwsh\n      - run: pnpm install\n        if: startsWith(runner.os, 'Windows')\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("t10 verify shell bash and action-setup fallback passes", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t10-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@10.11.0" }),
    );
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t10\njobs:\n  build:\n    runs-on: windows-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n          cache-dependency-path: pnpm-lock.yaml\n      - run: corepack enable\n        shell: bash\n      - uses: pnpm/action-setup@v4\n        with:\n          version: 10.11.0\n          run_install: false\n      - run: pnpm --version\n        shell: bash\n      - run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("t11 job name arbitrary passes", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t11-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@10.11.0" }),
    );
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t11\njobs:\n  weird-name:\n    runs-on: windows-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n          cache-dependency-path: pnpm-lock.yaml\n      - run: corepack enable\n      - run: corepack prepare pnpm@10.11.0 --activate\n      - run: pnpm --version\n      - run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("t12 aggregated report lists file and job", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t12-"));
    writeFile(
      tmp,
      "package.json",
      JSON.stringify({ packageManager: "pnpm@10.11.0" }),
    );
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t12a\njobs:\n  foo:\n    runs-on: windows-latest\n    steps:\n      - run: pnpm install\n`,
    );
    writeFile(
      tmp,
      ".github/workflows/b.yml",
      `name: t12b\njobs:\n  bar:\n    runs-on: windows-latest\n    steps:\n      - run: pnpm install\n`,
    );
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/a.yml > foo > step 1/);
    expect(res.stderr + res.stdout).toMatch(/b.yml > bar > step 1/);
  });
});
