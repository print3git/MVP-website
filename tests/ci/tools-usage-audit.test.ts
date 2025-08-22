import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, test } from "vitest";
import { audit } from "../../scripts/ci/tools-usage-audit";

function writeWorkflow(dir: string, content: string, name = "wf.yml"): string {
  const file = path.join(dir, name);
  fs.writeFileSync(file, content);
  return file;
}

describe("tools usage audit", () => {
  test("rg used + apt install present → pass", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wf-"));
    writeWorkflow(
      dir,
      `name: t\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - name: install\n        run: sudo apt-get install ripgrep\n      - name: search\n        run: rg foo\n`,
    );
    expect(audit(dir)).toEqual([]);
  });

  test("rg used + wrapper alias provided → pass", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wf-"));
    writeWorkflow(
      dir,
      `name: t\njobs:\n  build:\n    steps:\n      - name: search\n        run: |\n          command -v rg >/dev/null || rg() { grep "$@"; }\n          rg foo\n`,
    );
    expect(audit(dir)).toEqual([]);
  });

  test("rg used with neither install nor alias → fail", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wf-"));
    writeWorkflow(
      dir,
      `name: t\njobs:\n  build:\n    steps:\n      - name: bad\n        run: rg foo\n`,
    );
    const res = audit(dir);
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({ job: "build", step: "bad" });
  });

  test("grep fallback with -l/-n only → pass", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wf-"));
    writeWorkflow(
      dir,
      `name: t\njobs:\n  build:\n    steps:\n      - name: search\n        run: |\n          command -v rg >/dev/null || rg() { grep "$@"; }\n          rg -n foo\n          rg -l foo\n`,
    );
    expect(audit(dir)).toEqual([]);
  });

  test("grep fallback with ripgrep-only -g glob → fail", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wf-"));
    writeWorkflow(
      dir,
      `name: t\njobs:\n  build:\n    steps:\n      - name: search\n        run: |\n          command -v rg >/dev/null || rg() { grep "$@"; }\n          rg -g '*.ts' foo\n`,
    );
    const res = audit(dir);
    expect(res.some((v) => v.message.includes("ripgrep-only"))).toBe(true);
  });

  test("valid shell (bash) → pass", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wf-"));
    writeWorkflow(
      dir,
      `name: t\njobs:\n  build:\n    steps:\n      - name: ok\n        shell: bash\n        run: echo hi\n`,
    );
    expect(audit(dir)).toEqual([]);
  });

  test("invalid shell string with flags → fail", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wf-"));
    writeWorkflow(
      dir,
      `name: t\njobs:\n  build:\n    steps:\n      - name: bad\n        shell: "/usr/bin/bash -e"\n        run: echo hi\n`,
    );
    const res = audit(dir);
    expect(res).toHaveLength(1);
    expect(res[0].message).toMatch(/invalid shell/);
  });

  test("macOS runner with alias → pass", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wf-"));
    writeWorkflow(
      dir,
      `name: t\njobs:\n  build:\n    runs-on: macos-latest\n    steps:\n      - run: |\n          command -v rg >/dev/null || rg() { grep "$@"; }\n          rg foo\n`,
    );
    expect(audit(dir)).toEqual([]);
  });

  test("multiple rg steps with early install → pass", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wf-"));
    writeWorkflow(
      dir,
      `name: t\njobs:\n  build:\n    steps:\n      - run: sudo apt-get install ripgrep\n      - run: rg first\n      - run: rg second\n`,
    );
    expect(audit(dir)).toEqual([]);
  });

  test("job without rg unaffected → pass", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wf-"));
    writeWorkflow(
      dir,
      `name: t\njobs:\n  build:\n    steps:\n      - run: echo hi\n`,
    );
    expect(audit(dir)).toEqual([]);
  });

  test("wrapper functions l_only/n_only present when used → pass", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wf-"));
    writeWorkflow(
      dir,
      `name: t\njobs:\n  build:\n    steps:\n      - run: |\n          command -v rg >/dev/null || { l_only(){ grep -l "$@"; }; n_only(){ grep -n "$@"; }; }\n          l_only foo\n          n_only foo\n`,
    );
    expect(audit(dir)).toEqual([]);
  });

  test("summarize violations across multiple workflows", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wf-"));
    writeWorkflow(
      dir,
      `name: t\njobs:\n  a:\n    steps:\n      - run: rg foo\n`,
      "a.yml",
    );
    writeWorkflow(
      dir,
      `name: t\njobs:\n  b:\n    steps:\n      - shell: "/bin/bash -e"\n        run: echo hi\n`,
      "b.yml",
    );
    const res = audit(dir);
    expect(res).toHaveLength(2);
    const files = res.map((r) => r.file).sort();
    expect(files).toEqual(["a.yml", "b.yml"]);
  });
});
