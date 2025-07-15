const { loadScript } = require("../helpers");

test("loadScript removes ES module imports", () => {
  const src = "import foo from './bar.js';\nconst x = 1;";
  const fs = require("fs");
  const tmp = require("os").tmpdir();
  const path = require("path");
  const file = path.join(tmp, `tmp-${Date.now()}.js`);
  fs.writeFileSync(file, src);
  const repoRoot = path.join(__dirname, "..", "..");
  const rel = path.relative(repoRoot, file);
  const cleaned = loadScript(rel);
  fs.unlinkSync(file);
  expect(cleaned).toBe("const x = 1;");
});
