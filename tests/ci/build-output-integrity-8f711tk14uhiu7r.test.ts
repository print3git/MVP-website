/* eslint-disable jsdoc/check-tag-names */
/**
 * @ciOnly
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

function detectOutputDir(root: string): string {
  const candidates = [".next", "build", "dist", "out"];
  for (const dir of candidates) {
    const full = path.join(root, dir);
    if (fs.existsSync(full)) {
      return full;
    }
  }
  return root;
}

function walk(dir: string, list: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, list);
    } else {
      list.push(full);
    }
  }
  return list;
}

test("production build has no symlinks or missing assets", () => {
  execSync("npm run build", { stdio: "inherit" });

  const root = path.resolve(__dirname, "..");
  const outputDir = detectOutputDir(root);
  const files = walk(outputDir);

  const symlinks: string[] = [];
  const missingRefs: string[] = [];

  for (const file of files) {
    const rel = path.relative(root, file);
    const lst = fs.lstatSync(file);
    if (lst.isSymbolicLink()) {
      symlinks.push(rel);
      continue;
    }
    fs.accessSync(file, fs.constants.R_OK);

    if (/\.(html|css|js|json)$/.test(file)) {
      const content = fs.readFileSync(file, "utf8");
      const regex =
        /(?:href|src)=['"]([^'"#]+)['"]|url\(['"]?([^'"\)]+)['"]?\)/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content))) {
        const ref = match[1] || match[2];
        if (!ref || /^(?:https?:|data:|#|\/)/.test(ref)) {
          continue;
        }
        const refPath = path.resolve(path.dirname(file), ref);
        if (!fs.existsSync(refPath)) {
          missingRefs.push(`${rel} -> ${ref}`);
        }
      }
    }
  }

  expect(symlinks).toEqual([]);
  expect(missingRefs).toEqual([]);
});
