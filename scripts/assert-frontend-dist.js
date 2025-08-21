const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "..", "frontend", "dist");
if (!fs.existsSync(distDir)) {
  throw new Error(`Missing build output directory: ${distDir}`);
}
const indexFile = path.join(distDir, "index.html");
if (!fs.existsSync(indexFile)) {
  throw new Error(`Missing index.html in ${distDir}`);
}

/**
 * Recursively collect symlinks inside a directory.
 * @param {string} dir Directory to scan for symlinks.
 * @param {string[]} acc Accumulator for discovered symlink paths.
 * @returns {string[]} List of symlink paths found.
 */
function collectSymlinks(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      acc.push(full);
    } else if (entry.isDirectory()) {
      collectSymlinks(full, acc);
    }
  }
  return acc;
}

let symlinks = collectSymlinks(distDir);
if (symlinks.length) {
  const tmpDir = path.join(path.dirname(distDir), "dist_nolinks");
  fs.cpSync(distDir, tmpDir, { recursive: true, dereference: true });
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.renameSync(tmpDir, distDir);
  symlinks = collectSymlinks(distDir);
  if (symlinks.length) {
    console.error("Symlinks found in dist:");
    for (const link of symlinks) console.error(" -", link);
  } else {
    console.error("Symlinks were found and replaced with copies.");
  }
  process.exit(1);
}

console.log("Found frontend build output:", indexFile);
