import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const LFS_HEADER = "version https://git-lfs.github.com/spec";

export function isLfsPointer(data: Buffer | string): boolean {
  const txt =
    typeof data === "string"
      ? data
      : data.toString("utf8", 0, LFS_HEADER.length);
  return txt.startsWith(LFS_HEADER);
}

export function ensureFixture(p: string): void {
  if (fs.existsSync(p)) return;
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, "fixture-" + Math.random().toString(16));
}

export function runGuard(cwd: string, file: string): number {
  const attr = spawnSync("git", ["check-attr", "filter", "--", file], {
    cwd,
    encoding: "utf8",
  });
  if (attr.stdout.includes("filter: lfs")) return 1;
  const grep = spawnSync("git", ["grep", "-Il", LFS_HEADER, "--", file], {
    cwd,
  });
  return grep.status === 0 ? 1 : 0;
}

export function git(cwd: string, args: string[]): void {
  const res = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (res.status !== 0) throw new Error(res.stderr || res.stdout);
}
