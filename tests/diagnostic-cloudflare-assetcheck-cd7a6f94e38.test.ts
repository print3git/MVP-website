const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");

function findBuildDir() {
  const candidates = ["dist", "out", "build"];
  for (const dir of candidates) {
    const full = path.join(repoRoot, dir);
    if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
      return full;
    }
  }
  return repoRoot;
}

function walk(dir, list = []) {
  for (const entry of fs.readdirSync(dir)) {
    if (entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    const stat = fs.lstatSync(full);
    if (stat.isDirectory()) {
      walk(full, list);
    } else {
      list.push(full);
    }
  }
  return list;
}

describe("cloudflare asset diagnostics", () => {
  test("build directory has accessible assets", () => {
    process.env.CF_PAGES = "1";
    const buildDir = findBuildDir();
    expect(fs.existsSync(buildDir)).toBe(true);

    const files = walk(buildDir);
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const stat = fs.lstatSync(file);
      if (stat.isSymbolicLink()) {
        const target = fs.realpathSync(file);
        expect(target.startsWith(buildDir)).toBe(true);
      }
      const realStat = fs.statSync(file);
      expect(realStat.size).toBeGreaterThan(0);
    }

    const index = path.join(buildDir, "index.html");
    expect(fs.existsSync(index)).toBe(true);
    const html = fs.readFileSync(index, "utf8");
    const assetRefs = Array.from(html.matchAll(/(?:src|href)="([^"]+)"/g)).map(
      (m) => m[1],
    );
    for (const ref of assetRefs) {
      if (/^(?:https?:)?\/\//.test(ref)) continue;
      if (ref.startsWith("data:")) continue;
      const clean = ref.replace(/^\//, "");
      const assetPath = path.join(buildDir, clean);
      expect(fs.existsSync(assetPath)).toBe(true);
      const st = fs.statSync(assetPath);
      expect(st.size).toBeGreaterThan(0);
    }
  });
});
