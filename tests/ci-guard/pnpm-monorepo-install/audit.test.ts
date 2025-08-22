import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const SCRIPT = join(
  __dirname,
  "..",
  "..",
  "..",
  "scripts",
  "ci-guard",
  "pnpm-monorepo-install",
  "audit.ts",
);

function fixture(setup: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "pnpm-guard-"));
  setup(dir);
  return dir;
}

function run(dir: string, args: string[] = []) {
  return spawnSync("node", [SCRIPT, ...args], { cwd: dir, encoding: "utf8" });
}

describe("pnpm monorepo install audit", () => {
  test("t1 root package.json present, install at root -> pass", () => {
    const dir = fixture((d) => {
      writeFileSync(join(d, "package.json"), "{}");
      mkdirSync(join(d, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(d, ".github", "workflows", "wf.yml"),
        `jobs:\n  build:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: corepack enable\n      - uses: pnpm/action-setup@v4\n      - run: pnpm install --frozen-lockfile\n`,
      );
    });
    const r = run(dir);
    expect(r.status).toBe(0);
  });

  test("t2 no root package.json, install at root -> fail", () => {
    const dir = fixture((d) => {
      mkdirSync(join(d, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(d, ".github", "workflows", "wf.yml"),
        `jobs:\n  build:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: corepack enable\n      - uses: pnpm/action-setup@v4\n      - run: pnpm install --frozen-lockfile\n`,
      );
    });
    const r = run(dir);
    expect(r.status).toBe(1);
  });

  test("t3 frontend+backend present, installs in both -> pass", () => {
    const dir = fixture((d) => {
      mkdirSync(join(d, "frontend"), { recursive: true });
      writeFileSync(join(d, "frontend", "package.json"), "{}");
      mkdirSync(join(d, "backend"), { recursive: true });
      writeFileSync(join(d, "backend", "package.json"), "{}");
      mkdirSync(join(d, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(d, ".github", "workflows", "wf.yml"),
        `jobs:\n  build:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: corepack enable\n      - uses: pnpm/action-setup@v4\n      - run: pnpm install --frozen-lockfile\n        working-directory: frontend\n      - run: pnpm install --frozen-lockfile\n        working-directory: backend\n`,
      );
    });
    const r = run(dir);
    expect(r.status).toBe(0);
  });

  test("t4 only frontend present, install only in frontend -> pass", () => {
    const dir = fixture((d) => {
      mkdirSync(join(d, "frontend"), { recursive: true });
      writeFileSync(join(d, "frontend", "package.json"), "{}");
      mkdirSync(join(d, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(d, ".github", "workflows", "wf.yml"),
        `jobs:\n  build:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: corepack enable\n      - uses: pnpm/action-setup@v4\n      - run: pnpm install --frozen-lockfile\n        working-directory: frontend\n`,
      );
    });
    const r = run(dir);
    expect(r.status).toBe(0);
  });

  test("t5 missing bootstrap -> fail", () => {
    const dir = fixture((d) => {
      writeFileSync(join(d, "package.json"), "{}");
      mkdirSync(join(d, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(d, ".github", "workflows", "wf.yml"),
        `jobs:\n  build:\n    steps:\n      - run: pnpm install --frozen-lockfile\n`,
      );
    });
    const r = run(dir);
    expect(r.status).toBe(1);
  });

  test("t6 missing --frozen-lockfile -> fail", () => {
    const dir = fixture((d) => {
      writeFileSync(join(d, "package.json"), "{}");
      mkdirSync(join(d, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(d, ".github", "workflows", "wf.yml"),
        `jobs:\n  build:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: corepack enable\n      - uses: pnpm/action-setup@v4\n      - run: pnpm install\n`,
      );
    });
    const r = run(dir);
    expect(r.status).toBe(1);
  });

  test("t7 mixed npm & pnpm installs in same job -> fail", () => {
    const dir = fixture((d) => {
      writeFileSync(join(d, "package.json"), "{}");
      mkdirSync(join(d, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(d, ".github", "workflows", "wf.yml"),
        `jobs:\n  build:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: corepack enable\n      - uses: pnpm/action-setup@v4\n      - run: pnpm install --frozen-lockfile\n      - run: npm install\n`,
      );
    });
    const r = run(dir);
    expect(r.status).toBe(1);
  });

  test("t8 matrix job with some entries only frontend -> pass", () => {
    const dir = fixture((d) => {
      mkdirSync(join(d, "frontend"), { recursive: true });
      writeFileSync(join(d, "frontend", "package.json"), "{}");
      mkdirSync(join(d, "backend"), { recursive: true });
      writeFileSync(join(d, "backend", "package.json"), "{}");
      mkdirSync(join(d, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(d, ".github", "workflows", "wf.yml"),
        `jobs:\n  build:\n    strategy:\n      matrix:\n        dir: [frontend, backend]\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: corepack enable\n      - uses: pnpm/action-setup@v4\n      - run: pnpm install --frozen-lockfile\n        working-directory: \${{ matrix.dir }}\n`,
      );
    });
    const r = run(dir);
    expect(r.status).toBe(0);
  });

  test("t9 discovery writes roots.txt; runner reads it -> pass", () => {
    const dir = fixture((d) => {
      mkdirSync(join(d, "frontend"), { recursive: true });
      writeFileSync(join(d, "frontend", "package.json"), "{}");
      mkdirSync(join(d, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(d, ".github", "workflows", "wf.yml"),
        `jobs:\n  build:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: corepack enable\n      - uses: pnpm/action-setup@v4\n      - run: pnpm install --frozen-lockfile\n        working-directory: frontend\n`,
      );
    });
    const discover = run(dir, ["--discover"]);
    expect(discover.status).toBe(0);
    const roots = readFileSync(
      join(dir, "ci-guard", "pnpm-monorepo-install", "roots.txt"),
      "utf8",
    );
    expect(roots.trim()).toBe("frontend");
    const audit = run(dir);
    expect(audit.status).toBe(0);
  });

  test("t10 exotic path apps/web recognized -> pass", () => {
    const dir = fixture((d) => {
      mkdirSync(join(d, "apps", "web"), { recursive: true });
      writeFileSync(join(d, "apps", "web", "package.json"), "{}");
      mkdirSync(join(d, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(d, ".github", "workflows", "wf.yml"),
        `jobs:\n  build:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: corepack enable\n      - uses: pnpm/action-setup@v4\n      - run: pnpm install --frozen-lockfile\n        working-directory: apps/web\n`,
      );
    });
    const r = run(dir);
    expect(r.status).toBe(0);
  });

  test("t11 windows paths normalized -> pass", () => {
    const dir = fixture((d) => {
      mkdirSync(join(d, "frontend"), { recursive: true });
      writeFileSync(join(d, "frontend", "package.json"), "{}");
      mkdirSync(join(d, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(d, ".github", "workflows", "wf.yml"),
        `jobs:\n  build:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: corepack enable\n      - uses: pnpm/action-setup@v4\n      - run: pnpm install --frozen-lockfile\n        working-directory: frontend\\\\\n`,
      );
    });
    const r = run(dir);
    expect(r.status).toBe(0);
  });

  test("t12 summary aggregates offending steps", () => {
    const dir = fixture((d) => {
      mkdirSync(join(d, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(d, ".github", "workflows", "wf.yml"),
        `jobs:\n  bad1:\n    steps:\n      - run: pnpm install\n  bad2:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: corepack enable\n      - uses: pnpm/action-setup@v4\n      - run: pnpm install --frozen-lockfile\n      - run: npm install\n`,
      );
    });
    const r = run(dir);
    expect(r.status).toBe(1);
    const summary = JSON.parse(
      readFileSync(
        join(dir, "ci-guard", "pnpm-monorepo-install", "summary.json"),
        "utf8",
      ),
    );
    expect(summary.violations.length).toBeGreaterThanOrEqual(2);
    expect(summary.violations.some((v: any) => v.job === "bad1")).toBe(true);
    expect(summary.violations.some((v: any) => v.job === "bad2")).toBe(true);
  });
});
