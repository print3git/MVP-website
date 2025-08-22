import { mkdtempSync, writeFileSync, rmSync } from "fs";
import * as path from "path";
import * as os from "os";
import { auditFiles } from "../../../scripts/ci-guard/smoke-artifact/audit";

function wf(dir: string, content: string): string {
  const file = path.join(dir, "flow.yml");
  writeFileSync(file, content);
  return file;
}

function wrangler(dir: string, content: string): void {
  writeFileSync(path.join(dir, "wrangler.toml"), content);
}

describe("smoke artifact audit", () => {
  test("build and upload pass", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "wf-"));
    wrangler(
      dir,
      '[build]\ncommand = "pnpm -C frontend build"\n[pages]\nbuild_output_dir = "frontend/dist"\n',
    );
    const file = wf(
      dir,
      `jobs:\n  build:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n      - run: corepack enable\n      - uses: pnpm/action-setup@v4\n      - run: pnpm build\n        working-directory: frontend\n      - run: test -f frontend/dist/index.html\n        working-directory: frontend\n      - uses: actions/upload-artifact@v4\n        with:\n          name: frontend-dist\n          path: frontend/dist\n`,
    );
    const cwd = process.cwd();
    process.chdir(dir);
    const res = auditFiles([file]);
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
    expect(res.ok).toBe(true);
  });

  test("-C frontend build and download pass", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "wf-"));
    wrangler(
      dir,
      '[build]\ncommand = "pnpm -C frontend build"\n[pages]\nbuild_output_dir = "frontend/dist"\n',
    );
    const file = wf(
      dir,
      [
        "jobs:",
        "  build:",
        "    steps:",
        "      - uses: actions/setup-node@v4",
        "        with:",
        "          node-version: 20",
        "          cache: pnpm",
        "      - run: corepack enable",
        "      - uses: pnpm/action-setup@v4",
        "      - run: pnpm -C frontend build",
        "      - run: test -f frontend/dist/index.html",
        "      - uses: actions/upload-artifact@v4",
        "        with:",
        "          name: frontend-dist",
        "          path: frontend/dist",
        "  smoke:",
        "    needs: build",
        "    steps:",
        "      - uses: actions/download-artifact@v4",
        "        with:",
        "          name: frontend-dist",
        "          path: frontend/dist",
        "      - run: ls frontend/dist",
      ].join("\n"),
    );
    const cwd = process.cwd();
    process.chdir(dir);
    const res = auditFiles([file]);
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
    expect(res.ok).toBe(true);
  });

  test("missing upload fails", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "wf-"));
    wrangler(
      dir,
      '[build]\ncommand = "pnpm -C frontend build"\n[pages]\nbuild_output_dir = "frontend/dist"\n',
    );
    const file = wf(
      dir,
      `jobs:\n  build:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n      - run: corepack enable\n      - uses: pnpm/action-setup@v4\n      - run: pnpm build\n        working-directory: frontend\n      - run: test -f frontend/dist/index.html\n        working-directory: frontend\n`,
    );
    const cwd = process.cwd();
    process.chdir(dir);
    const res = auditFiles([file]);
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
    expect(res.ok).toBe(false);
  });

  test("missing download fails", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "wf-"));
    wrangler(
      dir,
      '[build]\ncommand = "pnpm -C frontend build"\n[pages]\nbuild_output_dir = "frontend/dist"\n',
    );
    const file = wf(
      dir,
      [
        "jobs:",
        "  build:",
        "    steps:",
        "      - uses: actions/setup-node@v4",
        "        with:",
        "          node-version: 20",
        "          cache: pnpm",
        "      - run: corepack enable",
        "      - uses: pnpm/action-setup@v4",
        "      - run: pnpm build",
        "        working-directory: frontend",
        "      - run: test -f frontend/dist/index.html",
        "        working-directory: frontend",
        "      - uses: actions/upload-artifact@v4",
        "        with:",
        "          name: frontend-dist",
        "          path: frontend/dist",
        "  smoke:",
        "    needs: build",
        "    steps:",
        "      - run: ls frontend/dist",
      ].join("\n"),
    );
    const cwd = process.cwd();
    process.chdir(dir);
    const res = auditFiles([file]);
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
    expect(res.ok).toBe(false);
  });

  test("matrix artifact names pass", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "wf-"));
    wrangler(
      dir,
      '[build]\ncommand = "pnpm -C frontend build"\n[pages]\nbuild_output_dir = "frontend/dist"\n',
    );
    const expr = "${{ matrix.node }}";
    const file = wf(
      dir,
      [
        "jobs:",
        "  build:",
        "    strategy:",
        "      matrix:",
        "        node: [18,20]",
        "        os: [ubuntu-latest, windows-latest]",
        "    steps:",
        "      - uses: actions/setup-node@v4",
        "        with:",
        `          node-version: ${expr}`,
        "          cache: pnpm",
        "      - run: corepack enable",
        "      - uses: pnpm/action-setup@v4",
        "      - run: pnpm build",
        "        working-directory: frontend",
        "      - run: test -f frontend/dist/index.html",
        "        working-directory: frontend",
        "      - uses: actions/upload-artifact@v4",
        "        with:",
        `          name: frontend-dist-${expr}-${expr}`,
        "          path: frontend/dist",
        "  smoke:",
        "    needs: build",
        "    strategy:",
        "      matrix:",
        "        node: [18,20]",
        "        os: [ubuntu-latest, windows-latest]",
        "    steps:",
        "      - uses: actions/download-artifact@v4",
        "        with:",
        `          name: frontend-dist-${expr}-${expr}`,
        "          path: frontend/dist",
        "      - run: ls frontend/dist",
      ].join("\n"),
    );
    const cwd = process.cwd();
    process.chdir(dir);
    const res = auditFiles([file]);
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
    expect(res.ok).toBe(true);
  });

  test("wrangler missing fields fails", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "wf-"));
    wrangler(dir, '[build]\ncommand = "pnpm -C frontend build"\n');
    const file = wf(dir, `jobs:\n  build:\n    steps: []\n`);
    const cwd = process.cwd();
    process.chdir(dir);
    const res = auditFiles([file]);
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
    expect(res.ok).toBe(false);
  });
});
