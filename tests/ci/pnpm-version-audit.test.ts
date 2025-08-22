import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { auditWorkflows } from "../../scripts/ci/pnpm-version-audit";

describe("pnpm-version-audit", () => {
  it("audits repository workflows", async () => {
    const { expectedVersion, violations } = await auditWorkflows(
      path.resolve(__dirname, "..", ".."),
    );
    expect(expectedVersion).toMatch(/^[0-9.]+$/);
    expect(Array.isArray(violations)).toBe(true);
  });

  it("throws when packageManager missing", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "audit-"));
    await writeFile(path.join(dir, "package.json"), "{}");
    await mkdir(path.join(dir, ".github/workflows"), { recursive: true });
    await writeFile(
      path.join(dir, ".github/workflows", "wf.yml"),
      `name: test\njobs:\n  build:\n    steps:\n      - uses: actions/setup-node@v4\n      - run: corepack enable\n      - uses: pnpm/action-setup@v4`,
    );
    await expect(auditWorkflows(dir)).rejects.toThrow(/packageManager/);
  });

  it("reports pinned version among multiple workflows", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "audit-"));
    await writeFile(
      path.join(dir, "package.json"),
      '{"packageManager":"pnpm@1.0.0"}',
    );
    const wfDir = path.join(dir, ".github/workflows");
    await mkdir(wfDir, { recursive: true });
    await writeFile(
      path.join(wfDir, "good.yml"),
      `name: good\njobs:\n  test:\n    steps:\n      - uses: actions/setup-node@v4\n      - run: corepack enable\n      - uses: pnpm/action-setup@v4`,
    );
    await writeFile(
      path.join(wfDir, "bad.yml"),
      `name: bad\njobs:\n  test:\n    steps:\n      - uses: actions/setup-node@v4\n      - run: corepack enable\n      - uses: pnpm/action-setup@v4\n        with:\n          version: 7`,
    );
    const { violations } = await auditWorkflows(dir);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatch(/bad.yml/);
  });

  it("flags missing actions/setup-node", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "audit-"));
    await writeFile(
      path.join(dir, "package.json"),
      '{"packageManager":"pnpm@1.0.0"}',
    );
    const wfDir = path.join(dir, ".github/workflows");
    await mkdir(wfDir, { recursive: true });
    await writeFile(
      path.join(wfDir, "wf.yml"),
      `name: wf\njobs:\n  build:\n    steps:\n      - run: corepack enable\n      - uses: pnpm/action-setup@v4`,
    );
    const { violations } = await auditWorkflows(dir);
    expect(violations).toContainEqual(
      expect.stringContaining("missing actions/setup-node@v4"),
    );
  });

  it("flags missing corepack enable", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "audit-"));
    await writeFile(
      path.join(dir, "package.json"),
      '{"packageManager":"pnpm@1.0.0"}',
    );
    const wfDir = path.join(dir, ".github/workflows");
    await mkdir(wfDir, { recursive: true });
    await writeFile(
      path.join(wfDir, "wf.yml"),
      `name: wf\njobs:\n  build:\n    steps:\n      - uses: actions/setup-node@v4\n      - uses: pnpm/action-setup@v4`,
    );
    const { violations } = await auditWorkflows(dir);
    expect(violations).toContainEqual(
      expect.stringContaining("missing corepack enable"),
    );
  });

  it("handles matrix jobs", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "audit-"));
    await writeFile(
      path.join(dir, "package.json"),
      '{"packageManager":"pnpm@1.0.0"}',
    );
    const wfDir = path.join(dir, ".github/workflows");
    await mkdir(wfDir, { recursive: true });
    await writeFile(
      path.join(wfDir, "wf.yml"),
      `name: wf\njobs:\n  build:\n    strategy:\n      matrix:\n        node: [18, 20]\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: \${{ matrix.node }}\n      - run: corepack enable\n      - uses: pnpm/action-setup@v4`,
    );
    const { violations } = await auditWorkflows(dir);
    expect(violations).toHaveLength(0);
  });
});
