/* eslint-disable jsdoc/check-tag-names */
/**
 * @ciOnly
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

function walk(dir, list = []) {
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

test("Cloudflare build output has no dangling links", () => {
  execSync("npm run build", { stdio: "inherit" });

  const root = path.resolve(__dirname, "..");
  const outputDir = fs.existsSync(path.join(root, "dist"))
    ? path.join(root, "dist")
    : fs.existsSync(path.join(root, "out"))
      ? path.join(root, "out")
      : root;

  const files = walk(outputDir);
  const inodeMap = new Map();
  const brokenSymlinks = [];

  for (const file of files) {
    const stats = fs.lstatSync(file);
    const rel = path.relative(root, file);
    if (stats.isSymbolicLink()) {
      const target = fs.readlinkSync(file);
      const targetPath = path.resolve(path.dirname(file), target);
      if (!fs.existsSync(targetPath)) {
        brokenSymlinks.push(`${rel} -> ${target}`);
      }
    }
    const id = `${stats.dev}-${stats.ino}`;
    const arr = inodeMap.get(id);
    if (arr) {
      arr.push(rel);
    } else {
      inodeMap.set(id, [rel]);
    }
    console.log(`${rel} (${stats.size} bytes)`);
  }

  const danglingHardLinks = [];
  for (const paths of inodeMap.values()) {
    const stats = fs.statSync(path.join(outputDir, paths[0]));
    if (stats.nlink > paths.length) {
      danglingHardLinks.push(paths.join(", "));
    }
  }

  expect(brokenSymlinks).toEqual([]);
  expect(danglingHardLinks).toEqual([]);
});
