import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { audit } from "../../scripts/ci/pm-policy-audit";

function setup(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-policy-"));
  for (const [f, content] of Object.entries(files)) {
    const full = path.join(dir, f);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

describe("pm-policy", () => {
  it("fails if multiple lockfiles exist", () => {
    const root = setup({
      "package.json": JSON.stringify({ packageManager: "pnpm@9" }),
      "pnpm-lock.yaml": "",
      "package-lock.json": "",
      ".github/workflows/a.yml": "name: t\n",
    });
    const errs = audit(root);
    expect(errs.some((e) => e.includes("lockfile"))).toBe(true);
  });

  it("passes for valid pnpm workflow", () => {
    const wf = `name: test\njobs:\n  build:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          cache: pnpm\n      - run: corepack enable\n      - run: pnpm i\n`;
    const root = setup({
      "package.json": JSON.stringify({ packageManager: "pnpm@9" }),
      "pnpm-lock.yaml": "",
      ".github/workflows/test.yml": wf,
    });
    const errs = audit(root);
    expect(errs).toEqual([]);
  });

  it("fails on npm ci usage", () => {
    const wf = `name: t\njobs:\n  j:\n    steps:\n      - run: npm ci\n`;
    const root = setup({
      "package.json": JSON.stringify({ packageManager: "pnpm@9" }),
      "pnpm-lock.yaml": "",
      ".github/workflows/w.yml": wf,
    });
    const errs = audit(root);
    expect(errs.some((e) => e.includes("npm ci"))).toBe(true);
  });

  it("fails on yarn usage", () => {
    const wf = `name: t\njobs:\n  j:\n    steps:\n      - run: yarn install\n`;
    const root = setup({
      "package.json": JSON.stringify({ packageManager: "pnpm@9" }),
      "pnpm-lock.yaml": "",
      ".github/workflows/w.yml": wf,
    });
    const errs = audit(root);
    expect(errs.some((e) => e.includes("yarn"))).toBe(true);
  });

  it("fails when pnpm/action-setup sets version", () => {
    const wf = `name: t\njobs:\n  j:\n    steps:\n      - uses: pnpm/action-setup@v3\n        with:\n          version: 8\n`;
    const root = setup({
      "package.json": JSON.stringify({ packageManager: "pnpm@9" }),
      "pnpm-lock.yaml": "",
      ".github/workflows/w.yml": wf,
    });
    const errs = audit(root);
    expect(errs.some((e) => e.includes("action-setup"))).toBe(true);
  });

  it("fails when corepack enable missing", () => {
    const wf = `name: t\njobs:\n  j:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          cache: pnpm\n`;
    const root = setup({
      "package.json": JSON.stringify({ packageManager: "pnpm@9" }),
      "pnpm-lock.yaml": "",
      ".github/workflows/w.yml": wf,
    });
    const errs = audit(root);
    expect(errs.some((e) => e.includes("corepack enable"))).toBe(true);
  });

  it("fails when setup-node cache is not pnpm", () => {
    const wf = `name: t\njobs:\n  j:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          cache: npm\n      - run: corepack enable\n`;
    const root = setup({
      "package.json": JSON.stringify({ packageManager: "pnpm@9" }),
      "pnpm-lock.yaml": "",
      ".github/workflows/w.yml": wf,
    });
    const errs = audit(root);
    expect(errs.some((e) => e.includes("cache"))).toBe(true);
  });
});
