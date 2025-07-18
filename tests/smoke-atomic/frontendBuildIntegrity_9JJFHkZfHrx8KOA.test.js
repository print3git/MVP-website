const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files = files.concat(walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

function checkFile(file) {
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink()) {
    const target = fs.realpathSync(file);
    expect(fs.existsSync(target)).toBe(true);
  } else {
    expect(stat.size).toBeGreaterThan(0);
  }
}

test("build output has no missing or empty files", () => {
  const res = spawnSync("npm", ["run", "build"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  expect(res.status).toBe(0);

  const outputDir = fs.existsSync(path.join(repoRoot, "dist"))
    ? path.join(repoRoot, "dist")
    : repoRoot;
  const files = walk(outputDir).filter(
    (f) =>
      !f.includes("node_modules") &&
      !path.basename(f).startsWith(".") &&
      path.basename(f) !== "pw.log",
  );
  expect(files.length).toBeGreaterThan(0);

  let indexFound = false;
  for (const file of files) {
    if (path.basename(file) === "index.html") indexFound = true;
    checkFile(file);
  }
  expect(indexFound).toBe(true);
});

test("html pages reference valid local assets", () => {
  const pages = ["index.html", "login.html", "profile.html"];
  pages.forEach((page) => {
    const file = path.join(repoRoot, page);
    if (!fs.existsSync(file)) return;
    const content = fs.readFileSync(file, "utf8");
    expect(content).toMatch(/<html/i);
    const regex = /<script[^>]+src="([^"]+)"/g;
    let m;
    while ((m = regex.exec(content)) !== null) {
      const src = m[1];
      if (src.startsWith("http")) continue;
      const asset = path.join(repoRoot, src);
      expect(fs.existsSync(asset)).toBe(true);
      expect(fs.statSync(asset).size).toBeGreaterThan(0);
    }
  });
});
