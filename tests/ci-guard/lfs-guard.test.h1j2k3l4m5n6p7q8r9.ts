import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { beforeAll, describe, expect, test } from "vitest";
import {
  LFS_HEADER,
  isLfsPointer,
  ensureFixture,
  runGuard,
  git,
} from "./lfs-guard-helpers.p9q8r7s6t5u4v3w2";

const fixturePath = path.join(__dirname, "__tmp__", "fixture.txt");

beforeAll(() => {
  ensureFixture(fixturePath);
});

describe("Group A — LFS pointer detection", () => {
  test("detects an LFS pointer header string", () => {
    expect(isLfsPointer(`${LFS_HEADER}/v1\n`)).toBe(true);
  });

  test("confirms sample files in tests/** are not LFS pointers", () => {
    const root = path.resolve(__dirname, "..");
    const files: string[] = [];
    function walk(dir: string) {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (ent.name === "node_modules") continue;
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          walk(p);
          if (files.length > 50) return;
        } else {
          files.push(p);
          if (files.length > 50) return;
        }
      }
    }
    walk(root);
    for (const f of files) {
      const buf = fs.readFileSync(f);
      expect(isLfsPointer(buf)).toBe(false);
    }
  });

  const testAttr = process.platform === "win32" ? test.skip : test;
  testAttr(".gitattributes does not apply filter=lfs to tests/**", () => {
    const out = spawnSync(
      "git",
      ["check-attr", "filter", "--", "tests/lfs-audit.test.ts"],
      { encoding: "utf8" },
    );
    expect(out.stdout.trim().endsWith("filter: unspecified")).toBe(true);
  });

  test.skip("fails if synthetic LFS pointer is introduced under tests/**", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lfs-"));
    const p = path.join(tmp, "tests", "bad.txt");
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, `${LFS_HEADER}/v1\n`);
    const buf = fs.readFileSync(p);
    // This assertion intentionally fails if the test is run
    expect(isLfsPointer(buf)).toBe(false);
  });

  test("snapshot of .gitattributes LFS lines", () => {
    const lines = fs
      .readFileSync(path.join(process.cwd(), ".gitattributes"), "utf8")
      .split(/\r?\n/)
      .filter((l) => l.includes("filter=lfs"));
    expect(lines.join("\n")).toMatchInlineSnapshot(`
"*.png filter=lfs diff=lfs merge=lfs -text\n*.jpg filter=lfs diff=lfs merge=lfs -text\n*.jpeg filter=lfs diff=lfs merge=lfs -text\n*.psd filter=lfs diff=lfs merge=lfs -text\n*.zip filter=lfs diff=lfs merge=lfs -text\nimg/** filter=lfs diff=lfs merge=lfs -text\nfrontend/** -filter=lfs -diff=lfs -merge=lfs\nfrontend/public/** -filter=lfs -diff=lfs -merge=lfs"
    `);
  });
});

describe("Group B — Fixture generation & usage", () => {
  test("fixture generator creates file with non-zero size", () => {
    const stat = fs.statSync(fixturePath);
    expect(stat.size).toBeGreaterThan(0);
  });

  test("first bytes do not match LFS pointer header", () => {
    const buf = fs.readFileSync(fixturePath);
    const first = buf.subarray(0, LFS_HEADER.length).toString();
    expect(first).not.toBe(LFS_HEADER);
  });

  test("consuming fixture does not require git lfs", () => {
    const txt = fs.readFileSync(fixturePath, "utf8");
    expect(isLfsPointer(txt)).toBe(false);
  });

  test("fixture regenerates if deleted", () => {
    fs.unlinkSync(fixturePath);
    expect(fs.existsSync(fixturePath)).toBe(false);
    ensureFixture(fixturePath);
    expect(fs.existsSync(fixturePath)).toBe(true);
  });
});

describe("Group C — CI behavior simulation", () => {
  const maybe = process.platform === "win32" ? test.skip : test;

  maybe("simulated guard script reports clean repo", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "repo-"));
    git(tmp, ["init"]);
    const file = path.join(tmp, "tests", "a.txt");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "hello");
    git(tmp, ["add", "."]);
    git(tmp, ["commit", "-m", "init"]);
    expect(runGuard(tmp, "tests/a.txt")).toBe(0);
  });

  test("pages build workflow avoids explicit git lfs commands", () => {
    const wf = fs.readFileSync(
      path.join(process.cwd(), ".github/workflows/pages-deploy.yml"),
      "utf8",
    );
    expect(/git lfs/i.test(wf)).toBe(false);
  });

  maybe("simulated guard exits non-zero when filter=lfs applies", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "repo-"));
    fs.writeFileSync(path.join(tmp, ".gitattributes"), "tests/** filter=lfs\n");
    git(tmp, ["init"]);
    const file = path.join(tmp, "tests", "a.txt");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "hello");
    git(tmp, ["add", "."]);
    git(tmp, ["commit", "-m", "init"]);
    expect(runGuard(tmp, "tests/a.txt")).not.toBe(0);
  });
});
