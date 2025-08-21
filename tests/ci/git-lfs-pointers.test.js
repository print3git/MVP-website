const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      walk(path.join(dir, entry.name), files);
    } else {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

test("git-lfs pointer integrity", () => {
  const attrPath = path.join(process.cwd(), ".gitattributes");
  const hasAttr =
    fs.existsSync(attrPath) &&
    /\.(png|jpe?g|gif|webp)/i.test(fs.readFileSync(attrPath, "utf8"));
  const imgDir = path.join(process.cwd(), "img");
  if (!hasAttr && !fs.existsSync(imgDir)) {
    return test.skip("no images or LFS attributes to check");
  }
  const patterns = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
  const files = fs.existsSync(imgDir)
    ? walk(imgDir).filter((f) =>
        patterns.some((p) => f.toLowerCase().endsWith(p)),
      )
    : [];
  const offenders = files.filter((f) => {
    const buf = fs.readFileSync(f, { encoding: "utf8", flag: "r" });
    return !buf.startsWith("version https://git-lfs.github.com/spec/v1");
  });
  if (offenders.length) {
    const list = offenders.join(", ");
    assert.fail(
      `Non-LFS images detected: ${list}. Fix: git lfs migrate import --include="${offenders.join(",")}"`,
    );
  }
});
