#!/usr/bin/env node
// @ts-nocheck
import fs from "fs";
import path from "path";

const repoRoot: string = path.resolve(__dirname, "..");
const argDir: string | undefined = process.argv[2];
const outputDir: string = argDir
  ? path.resolve(repoRoot, argDir)
  : fs.existsSync(path.join(repoRoot, "dist"))
    ? path.join(repoRoot, "dist")
    : repoRoot;

const badPaths: string[] = [];

function walk(dir: string): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err: unknown) {
    const message =
      err && err instanceof Error
        ? (err as NodeJS.ErrnoException).code ?? err.message
        : String(err);
    badPaths.push(`${dir} (${message})`);
    return;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    try {
      const lst = fs.lstatSync(full);
      if (lst.isSymbolicLink()) {
        try {
          const target = fs.readlinkSync(full);
          fs.statSync(path.resolve(path.dirname(full), target));
        } catch {
          badPaths.push(`broken symlink: ${full}`);
          continue;
        }
      }
      if (lst.isDirectory()) {
        walk(full);
      } else {
        fs.accessSync(full, fs.constants.R_OK);
      }
    } catch (err: unknown) {
      const message =
        err && err instanceof Error
          ? (err as NodeJS.ErrnoException).code ?? err.message
          : String(err);
      badPaths.push(`${full} (${message})`);
    }
  }
}

walk(outputDir);

if (badPaths.length) {
  console.error("Build output verification failed. Issues found:");
  for (const p of badPaths) console.error(" -", p);
  process.exit(1);
}

console.log("No broken symlinks or permission issues detected.");
