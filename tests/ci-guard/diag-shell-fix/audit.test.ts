import fs from "fs";
import os from "os";
import path from "path";
import { audit } from "../../../scripts/ci-guard/diag-shell-fix/audit";

function setup(content: string | Record<string, string>): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "audit-"));
  const dir = path.join(tmp, ".github", "workflows");
  fs.mkdirSync(dir, { recursive: true });
  if (typeof content === "string") {
    fs.writeFileSync(path.join(dir, "wf.yml"), content);
  } else {
    for (const [name, data] of Object.entries(content)) {
      fs.writeFileSync(path.join(dir, name), data);
    }
  }
  return dir;
}

describe("diag-shell-fix audit", () => {
  test("t1 valid collector passes", () => {
    const dir = setup(
      `name: test\njobs:\n  collect:\n    runs-on: ubuntu-latest\n    steps:\n      - run: mkdir -p ci/diag\n      - name: logs\n        shell: bash\n        run: |\n          set -euo pipefail\n          command -v dmesg >/dev/null && dmesg > ci/diag/d.log || true\n      - uses: actions/upload-artifact@v4\n        if: always()\n        with:\n          path: ci/diag\n`,
    );
    expect(audit(dir)).toHaveLength(0);
  });

  test("t2 invalid shell fails", () => {
    const dir = setup(
      `name: bad\njobs:\n  j:\n    runs-on: ubuntu-latest\n    steps:\n      - name: step\n        shell: /usr/bin/bash -e\n        run: echo hi\n`,
    );
    const errs = audit(dir);
    expect(errs[0].message).toMatch(/invalid shell/);
    expect(errs[0].file).toBe("wf.yml");
  });

  test("t3 collector missing mkdir fails", () => {
    const dir = setup(
      `name: bad\njobs:\n  j:\n    runs-on: ubuntu-latest\n    steps:\n      - name: logs\n        shell: bash\n        run: dmesg > ci/diag/d.log || true\n      - uses: actions/upload-artifact@v4\n        if: always()\n        with:\n          path: ci/diag\n`,
    );
    const errs = audit(dir);
    expect(errs.some((e) => e.message.includes("missing mkdir"))).toBe(true);
  });

  test("t4 collector missing upload fails", () => {
    const dir = setup(
      `name: bad\njobs:\n  j:\n    runs-on: ubuntu-latest\n    steps:\n      - run: mkdir -p ci/diag\n      - name: logs\n        shell: bash\n        run: command -v dmesg >/dev/null && dmesg > ci/diag/d.log || true\n`,
    );
    const errs = audit(dir);
    expect(
      errs.some((e) => e.message.includes("missing upload-artifact")),
    ).toBe(true);
  });

  test("t5 upload missing if always fails", () => {
    const dir = setup(
      `name: bad\njobs:\n  j:\n    runs-on: ubuntu-latest\n    steps:\n      - run: mkdir -p ci/diag\n      - name: logs\n        shell: bash\n        run: command -v dmesg >/dev/null && dmesg > ci/diag/d.log || true\n      - uses: actions/upload-artifact@v4\n        with:\n          path: ci/diag\n`,
    );
    const errs = audit(dir);
    expect(errs.some((e) => e.message.includes("if: always"))).toBe(true);
  });

  test("t6 dmesg without guard fails", () => {
    const dir = setup(
      `name: bad\njobs:\n  j:\n    runs-on: ubuntu-latest\n    steps:\n      - run: mkdir -p ci/diag\n      - name: logs\n        shell: bash\n        run: dmesg > ci/diag/d.log\n      - uses: actions/upload-artifact@v4\n        if: always()\n        with:\n          path: ci/diag\n`,
    );
    const errs = audit(dir);
    expect(errs.some((e) => e.message.includes("dmesg not guarded"))).toBe(
      true,
    );
  });

  test("t7 journalctl without guard fails", () => {
    const dir = setup(
      `name: bad\njobs:\n  j:\n    runs-on: ubuntu-latest\n    steps:\n      - run: mkdir -p ci/diag\n      - name: logs\n        shell: bash\n        run: journalctl -xe > ci/diag/j.log\n      - uses: actions/upload-artifact@v4\n        if: always()\n        with:\n          path: ci/diag\n`,
    );
    const errs = audit(dir);
    expect(errs.some((e) => e.message.includes("journalctl not guarded"))).toBe(
      true,
    );
  });

  test("t8a guarded cp passes", () => {
    const dir = setup(
      `name: good\njobs:\n  j:\n    runs-on: ubuntu-latest\n    steps:\n      - run: mkdir -p ci/diag\n      - name: copy\n        shell: bash\n        run: |\n          [ -d backend ] && cp -r backend ci/diag/backend\n      - uses: actions/upload-artifact@v4\n        if: always()\n        with:\n          path: ci/diag\n`,
    );
    expect(audit(dir)).toHaveLength(0);
  });

  test("t8b unguarded cp fails", () => {
    const dir = setup(
      `name: bad\njobs:\n  j:\n    runs-on: ubuntu-latest\n    steps:\n      - run: mkdir -p ci/diag\n      - name: copy\n        shell: bash\n        run: cp -r backend ci/diag/backend\n      - uses: actions/upload-artifact@v4\n        if: always()\n        with:\n          path: ci/diag\n`,
    );
    const errs = audit(dir);
    expect(
      errs.some((e) => e.message.includes("cp to ci/diag not guarded")),
    ).toBe(true);
  });

  test("t9 aggregates errors across workflows", () => {
    const dir = setup({
      "a.yml": `name: a\njobs:\n  j:\n    runs-on: ubuntu-latest\n    steps:\n      - run: mkdir -p ci/diag\n      - name: logs\n        shell: bash\n        run: dmesg > ci/diag/d.log\n      - uses: actions/upload-artifact@v4\n        if: always()\n        with:\n          path: ci/diag\n`,
      "b.yml": `name: b\njobs:\n  j:\n    runs-on: ubuntu-latest\n    steps:\n      - run: mkdir -p ci/diag\n      - name: logs\n        shell: bash\n        run: journalctl -xe > ci/diag/j.log\n      - uses: actions/upload-artifact@v4\n        if: always()\n        with:\n          path: ci/diag\n`,
    });
    const errs = audit(dir);
    expect(errs.length).toBe(2);
  });

  test("t10 non-diagnostic shell flags fail", () => {
    const dir = setup(
      `name: bad\njobs:\n  j:\n    runs-on: ubuntu-latest\n    steps:\n      - name: step\n        shell: bash -e\n        run: echo hi\n`,
    );
    const errs = audit(dir);
    expect(errs[0].message).toMatch(/move shell flags/);
  });

  test("t11 matrix job passes", () => {
    const dir = setup(
      `name: good\njobs:\n  j:\n    runs-on: ubuntu-latest\n    strategy:\n      matrix:\n        node: [20]\n    steps:\n      - run: mkdir -p ci/diag\n      - name: logs\n        shell: bash\n        run: command -v dmesg >/dev/null && dmesg > ci/diag/d.log || true\n      - uses: actions/upload-artifact@v4\n        if: always()\n        with:\n          path: ci/diag\n`,
    );
    expect(audit(dir)).toHaveLength(0);
  });

  test("t12 windows job ignored", () => {
    const dir = setup(
      `name: win\njobs:\n  j:\n    runs-on: windows-latest\n    steps:\n      - name: logs\n        shell: pwsh\n        run: Get-EventLog System\n`,
    );
    expect(audit(dir)).toHaveLength(0);
  });
});
