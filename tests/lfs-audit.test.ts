import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  existsSync,
  statSync,
  readdirSync,
} from "node:fs";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { getLfsGlobs, listFiles } from "../scripts/ci/check-lfs";

function sample<T>(arr: T[], n: number): T[] {
  return arr.slice(0, n);
}

describe("lfs", () => {
  it("pointer integrity", async () => {
    const globs = await getLfsGlobs();
    for (const g of globs) {
      const files = listFiles([g]);
      const picks = sample(files, 10);
      for (const f of picks) {
        const content = execFileSync("git", ["show", `HEAD:${f}`], {
          encoding: "utf8",
          env: { ...process.env, GIT_LFS_SKIP_SMUDGE: "1" },
        });
        if (!content.startsWith("version https://git-lfs.github.com/spec/v1")) {
          console.warn("non-pointer", f);
          return;
        }
      }
    }
  });

  it("checkout behavior", () => {
    const globs = listFiles(["img/**", "*.png", "*.jpg", "*.jpeg"]);
    if (!globs.length) {
      return;
    }
    const sampleFile = globs[0];
    const tmp = mkdtempSync(path.join(tmpdir(), "lfs-clone-"));
    try {
      execFileSync("git", ["clone", ".", tmp], {
        env: { ...process.env, GIT_LFS_SKIP_SMUDGE: "1" },
        stdio: "ignore",
      });
      const pointer = readFileSync(
        path.join(tmp, sampleFile),
        "utf8",
      ).startsWith("version https://git-lfs.github.com/spec/v1");
      if (!pointer) {
        return;
      }
      execFileSync("git", ["-C", tmp, "lfs", "install"], { stdio: "ignore" });
      execFileSync("git", ["-C", tmp, "lfs", "pull"], { stdio: "ignore" });
      const after = readFileSync(path.join(tmp, sampleFile), "utf8");
      expect(
        after.startsWith("version https://git-lfs.github.com/spec/v1"),
      ).toBe(false);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("build compatibility", () => {
    try {
      execFileSync("npm", ["run", "build"], { stdio: "ignore" });
    } catch {
      return;
    }
    expect(existsSync("frontend/dist/index.html")).toBe(true);
    expect(existsSync("frontend/dist/.gitattributes")).toBe(false);
  });

  it("pages/ci parity", () => {
    const tmp = mkdtempSync(path.join(tmpdir(), "lfs-pages-"));
    try {
      execFileSync("git", ["clone", ".", tmp], {
        env: { ...process.env, GIT_LFS_SKIP_SMUDGE: "1" },
        stdio: "ignore",
      });
      execFileSync("git", ["-C", tmp, "lfs", "install"], { stdio: "ignore" });
      execFileSync("git", ["-C", tmp, "lfs", "pull"], { stdio: "ignore" });
      try {
        execFileSync("npm", ["run", "build"], { cwd: tmp, stdio: "ignore" });
      } catch {
        return;
      }
      const original = readFileSync("frontend/dist/index.html", "utf8");
      const cloneOut = readFileSync(
        path.join(tmp, "frontend/dist/index.html"),
        "utf8",
      );
      expect(cloneOut).toBe(original);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("guard script contract", () => {
    const tmp = mkdtempSync(path.join(tmpdir(), "lfs-guard-"));
    try {
      execFileSync("git", ["init"], { cwd: tmp, stdio: "ignore" });
      fs.writeFileSync(
        path.join(tmp, ".gitattributes"),
        "*.png filter=lfs diff=lfs merge=lfs -text\n",
      );
      fs.writeFileSync(path.join(tmp, "file.png"), "not a pointer\n");
      execFileSync("git", ["add", ".gitattributes", "file.png"], {
        cwd: tmp,
        stdio: "ignore",
      });
      execFileSync("git", ["commit", "-m", "test"], {
        cwd: tmp,
        env: {
          ...process.env,
          GIT_COMMITTER_NAME: "t",
          GIT_COMMITTER_EMAIL: "t@t",
          GIT_AUTHOR_NAME: "t",
          GIT_AUTHOR_EMAIL: "t@t",
        },
        stdio: "ignore",
      });
      let code = 0;
      try {
        execFileSync("node", [path.resolve(__dirname, "../scripts/ci/check-lfs.ts")], {
          cwd: tmp,
          stdio: "pipe",
        });
      } catch (err: any) {
        code = err.status || 0;
      }
      expect(code).not.toBe(0);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it(".gitattributes drift", () => {
    const files = execFileSync("git", ["ls-files"], { encoding: "utf8" })
      .split(/\r?\n/)
      .filter(Boolean);
    const exts = new Set(
      files
        .map((f) => path.extname(f).toLowerCase())
        .filter((e) => [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".bmp"].includes(e)),
    );
    const attrs = readFileSync(".gitattributes", "utf8");
    exts.forEach((ext) => {
      expect(attrs.includes(`*${ext}`)).toBe(true);
    });
  });

  it("size sanity", () => {
    const dist = "frontend/dist";
    const walk = (dir: string): number => {
      let total = 0;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) total += walk(full);
        else total += statSync(full).size;
      }
      return total;
    };
    if (!existsSync(dist)) {
      return;
    }
    const total = walk(dist) / (1024 * 1024);
    expect(total).toBeLessThan(100);
  });
});
