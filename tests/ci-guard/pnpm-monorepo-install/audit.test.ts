import fs from "fs";
import os from "os";
import path from "path";
import { auditFiles } from "../../../scripts/ci-guard/pnpm-monorepo-install/audit";

function setup(structure: Record<string, string>): { dir: string; workflows: string[] } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "repo-"));
  const workflows: string[] = [];
  for (const [p, content] of Object.entries(structure)) {
    const full = path.join(dir, p);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
    if (p.startsWith(".github/workflows/")) workflows.push(full);
  }
  return { dir, workflows };
}

describe("pnpm monorepo install audit", () => {
  test("t1 root package.json present, install at root → pass", () => {
    const wf = [
      "name: t1",
      "jobs:",
      "  build:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/setup-node@v4",
      "        with:",
      "          node-version: 20",
      "      - run: corepack enable",
      "      - uses: pnpm/action-setup@v4",
      "      - run: pnpm install --frozen-lockfile",
    ].join("\n");
    const { dir, workflows } = setup({
      "package.json": "{}",
      ".github/workflows/a.yml": wf,
    });
    const res = auditFiles(workflows, dir);
    expect(res.ok).toBe(true);
  });

  test("t2 no root package.json, install at root → fail", () => {
    const wf = [
      "name: t2",
      "jobs:",
      "  build:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/setup-node@v4",
      "        with:",
      "          node-version: 20",
      "      - run: corepack enable",
      "      - uses: pnpm/action-setup@v4",
      "      - run: pnpm install --frozen-lockfile",
    ].join("\n");
    const { dir, workflows } = setup({ ".github/workflows/a.yml": wf });
    const res = auditFiles(workflows, dir);
    expect(res.ok).toBe(false);
  });

  test("t3 frontend+backend present, installs in both → pass", () => {
    const wf = [
      "name: t3",
      "jobs:",
      "  build:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/setup-node@v4",
      "        with:",
      "          node-version: 20",
      "      - run: corepack enable",
      "      - uses: pnpm/action-setup@v4",
      "      - run: pnpm install --frozen-lockfile",
      "        working-directory: frontend",
      "      - run: pnpm install --frozen-lockfile",
      "        working-directory: backend",
    ].join("\n");
    const { dir, workflows } = setup({
      "frontend/package.json": "{}",
      "backend/package.json": "{}",
      ".github/workflows/a.yml": wf,
    });
    const res = auditFiles(workflows, dir);
    expect(res.ok).toBe(true);
  });

  test("t4 only frontend present, install only in frontend → pass", () => {
    const wf = [
      "name: t4",
      "jobs:",
      "  build:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/setup-node@v4",
      "        with:",
      "          node-version: 20",
      "      - run: corepack enable",
      "      - uses: pnpm/action-setup@v4",
      "      - run: pnpm install --frozen-lockfile",
      "        working-directory: frontend",
    ].join("\n");
    const { dir, workflows } = setup({
      "frontend/package.json": "{}",
      ".github/workflows/a.yml": wf,
    });
    const res = auditFiles(workflows, dir);
    expect(res.ok).toBe(true);
  });

  test("t5 missing bootstrap (no corepack) → fail", () => {
    const wf = [
      "name: t5",
      "jobs:",
      "  build:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/setup-node@v4",
      "        with:",
      "          node-version: 20",
      "      - uses: pnpm/action-setup@v4",
      "      - run: pnpm install --frozen-lockfile",
    ].join("\n");
    const { dir, workflows } = setup({ "package.json": "{}", ".github/workflows/a.yml": wf });
    const res = auditFiles(workflows, dir);
    expect(res.ok).toBe(false);
  });

  test("t6 pnpm install without --frozen-lockfile → fail", () => {
    const wf = [
      "name: t6",
      "jobs:",
      "  build:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/setup-node@v4",
      "        with:",
      "          node-version: 20",
      "      - run: corepack enable",
      "      - uses: pnpm/action-setup@v4",
      "      - run: pnpm install",
    ].join("\n");
    const { dir, workflows } = setup({ "package.json": "{}", ".github/workflows/a.yml": wf });
    const res = auditFiles(workflows, dir);
    expect(res.ok).toBe(false);
  });

  test("t7 mixed npm & pnpm installs in same job → fail", () => {
    const wf = [
      "name: t7",
      "jobs:",
      "  build:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/setup-node@v4",
      "        with:",
      "          node-version: 20",
      "      - run: corepack enable",
      "      - uses: pnpm/action-setup@v4",
      "      - run: pnpm install --frozen-lockfile",
      "      - run: npm install",
    ].join("\n");
    const { dir, workflows } = setup({ "package.json": "{}", ".github/workflows/a.yml": wf });
    const res = auditFiles(workflows, dir);
    expect(res.ok).toBe(false);
  });

  test("t8 matrix job with variable working-directory → pass", () => {
    const expr = "${{ matrix.dir }}";
    const wf = [
      "name: t8",
      "jobs:",
      "  build:",
      "    runs-on: ubuntu-latest",
      "    strategy:",
      "      matrix:",
      "        dir: [frontend]",
      "    steps:",
      "      - uses: actions/setup-node@v4",
      "        with:",
      "          node-version: 20",
      "      - run: corepack enable",
      "      - uses: pnpm/action-setup@v4",
      "      - run: pnpm install --frozen-lockfile",
      `        working-directory: ${expr}`,
    ].join("\n");
    const { dir, workflows } = setup({
      "frontend/package.json": "{}",
      ".github/workflows/a.yml": wf,
    });
    const res = auditFiles(workflows, dir);
    expect(res.ok).toBe(true);
  });

  test("t9 discovery writes roots.txt; runner reads it → pass", () => {
    const run = [
      "while read d; do",
      "  (cd \"$d\" && pnpm install --frozen-lockfile)",
      "done < ci-guard/pnpm-monorepo-install/roots.txt",
    ].join("\n");
    const wf = [
      "name: t9",
      "jobs:",
      "  build:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/setup-node@v4",
      "        with:",
      "          node-version: 20",
      "      - run: corepack enable",
      "      - uses: pnpm/action-setup@v4",
      "      - run: scripts/ci-guard/pnpm-monorepo-install/discover.sh",
      `      - run: |\n          ${run}`,
    ].join("\n");
    const { dir, workflows } = setup({ "package.json": "{}", ".github/workflows/a.yml": wf });
    const res = auditFiles(workflows, dir);
    expect(res.ok).toBe(true);
  });

  test("t10 exotic path apps/web recognized → pass", () => {
    const wf = [
      "name: t10",
      "jobs:",
      "  build:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/setup-node@v4",
      "        with:",
      "          node-version: 20",
      "      - run: corepack enable",
      "      - uses: pnpm/action-setup@v4",
      "      - run: pnpm install --frozen-lockfile",
      "        working-directory: apps/web",
    ].join("\n");
    const { dir, workflows } = setup({
      "apps/web/package.json": "{}",
      ".github/workflows/a.yml": wf,
    });
    const res = auditFiles(workflows, dir);
    expect(res.ok).toBe(true);
  });

  test("t11 windows runners paths normalization → pass", () => {
    const wf = [
      "name: t11",
      "jobs:",
      "  build:",
      "    runs-on: windows-latest",
      "    steps:",
      "      - uses: actions/setup-node@v4",
      "        with:",
      "          node-version: 20",
      "      - run: corepack enable",
      "      - uses: pnpm/action-setup@v4",
      "      - run: pnpm install --frozen-lockfile",
      "        working-directory: \"backend\\\\\"",
    ].join("\n");
    const { dir, workflows } = setup({
      "backend/package.json": "{}",
      ".github/workflows/a.yml": wf,
    });
    const res = auditFiles(workflows, dir);
    expect(res.ok).toBe(true);
  });

  test("t12 summary aggregates offending steps", () => {
    const wf = [
      "name: bad",
      "jobs:",
      "  build:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/setup-node@v4",
      "        with:",
      "          node-version: 20",
      "      - run: corepack enable",
      "      - uses: pnpm/action-setup@v4",
      "      - run: pnpm install --frozen-lockfile",
    ].join("\n");
    const { dir, workflows } = setup({
      ".github/workflows/a.yml": wf,
      ".github/workflows/b.yml": wf,
    });
    const res = auditFiles(workflows, dir);
    expect(res.ok).toBe(false);
    const files = Object.keys(res.files).map((f) => path.basename(f)).sort();
    expect(files).toEqual(["a.yml", "b.yml"]);
    for (const f of Object.keys(res.files)) {
      const jobs = res.files[f].jobs;
      expect(jobs.build.steps.length).toBeGreaterThan(0);
    }
  });
});
