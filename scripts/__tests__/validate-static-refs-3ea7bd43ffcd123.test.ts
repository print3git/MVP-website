import fs from "fs";
import path from "path";

const OUTPUT_DIR_CANDIDATES = ["out", ".next", "public"];
const EXPORT_DIR =
  process.env.NEXT_EXPORT_DIR ||
  OUTPUT_DIR_CANDIDATES.find((d) => fs.existsSync(d));

function collectFiles(dir, exts, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full, exts, files);
    else if (entry.isFile() && exts.includes(path.extname(entry.name)))
      files.push(full);
  }
  return files;
}

function extractRefs(content) {
  const refs = [];
  const attrRegex = /(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g;
  const cssUrlRegex = /url\((?:"|')?([^"')?#]+)(?:[?#][^"')]*)?(?:"|')?\)/g;
  const importRegex = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
  const fromRegex = /from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = attrRegex.exec(content))) refs.push(m[1]);
  while ((m = cssUrlRegex.exec(content))) refs.push(m[1]);
  while ((m = importRegex.exec(content))) refs.push(m[1]);
  while ((m = fromRegex.exec(content))) refs.push(m[1]);
  return refs;
}

function isRelative(ref) {
  return !/^(?:[a-z]+:|\/|#)/i.test(ref);
}

test("static output has no broken relative references", () => {
  if (!EXPORT_DIR) {
    console.warn("No static output directory found; skipping check.");
    return;
  }
  const exts = [".html", ".js", ".css"];
  const files = collectFiles(EXPORT_DIR, exts);
  const missing = [];
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const refs = extractRefs(content);
    for (const ref of refs) {
      if (!isRelative(ref)) continue;
      const resolved = path.resolve(path.dirname(file), ref);
      if (!fs.existsSync(resolved)) {
        missing.push(`${path.relative(EXPORT_DIR, file)} -> ${ref}`);
      }
    }
  }
  if (missing.length) {
    console.error("Broken references:\n" + missing.join("\n"));
  }
  expect(missing).toEqual([]);
});
