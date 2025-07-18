const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const srcDirs = [path.join(repoRoot, "js"), path.join(repoRoot, "src")];

function getFiles(dir) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const res = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      files = files.concat(getFiles(res));
    } else if (res.match(/\.(js|jsx|ts|tsx)$/)) {
      files.push(res);
    }
  }
  return files;
}

function collectImports(file) {
  const content = fs.readFileSync(file, "utf8");
  const imports = new Set();
  const regexes = [
    /import\s+(?:[^'"\n]*?from\s+)?['"]([^'"\n]+)['"]/g,
    /require\(\s*['"]([^'"\n]+)['"]\s*\)/g,
    /import\(\s*['"]([^'"\n]+)['"]\s*\)/g,
  ];
  for (const regex of regexes) {
    let m;
    while ((m = regex.exec(content))) {
      const pkg = m[1];
      if (pkg.startsWith(".") || pkg.startsWith("/")) continue;
      let name = pkg;
      if (pkg.startsWith("@")) {
        const parts = pkg.split("/");
        name = parts.slice(0, 2).join("/");
      } else {
        name = pkg.split("/")[0];
      }
      imports.add(name);
    }
  }
  return imports;
}

describe("frontend dependencies in package.json match imports", () => {
  const pkg = require(path.join(repoRoot, "package.json"));
  const declared = Object.keys(pkg.dependencies || {});

  const used = new Set();
  for (const dir of srcDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of getFiles(dir)) {
      for (const dep of collectImports(file)) used.add(dep);
    }
  }

  test("no declared dependency is unused", () => {
    const unused = declared.filter((dep) => !used.has(dep));
    expect(unused).toEqual([]);
  });

  test("no missing dependency in package.json", () => {
    const missing = Array.from(used).filter((dep) => !declared.includes(dep));
    expect(missing).toEqual([]);
  });
});
