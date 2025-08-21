const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function rootScripts() {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
    );
    return pkg.scripts || {};
  } catch {
    return {};
  }
}

const scripts = rootScripts();
const buildScript = scripts.build || "";
const referencesFrontend = /--prefix\s+frontend/.test(buildScript);

const frontendDir = path.join(process.cwd(), "frontend");

if (!fs.existsSync(frontendDir)) {
  test("frontend directory referenced", () => {
    if (referencesFrontend) {
      assert.fail(
        "root build script references frontend but frontend/ directory is missing. Fix: add frontend/ or update build step.",
      );
    }
  });
  test.skip("no frontend directory");
} else {
  test("frontend prerequisites", () => {
    const pkgPath = path.join(frontendDir, "package.json");
    if (!fs.existsSync(pkgPath)) {
      return assert.fail(
        "frontend/package.json missing. Fix: add frontend package manifest.",
      );
    }
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
    const hasVite = !!deps.vite;
    if (referencesFrontend && !hasVite) {
      assert.fail("Add vite to frontend devDependencies or update build step.");
    }
    const viteBin = path.join(frontendDir, "node_modules", ".bin", "vite");
    if (referencesFrontend) {
      assert.ok(
        fs.existsSync(viteBin),
        "frontend build referenced but vite binary not found. Run pnpm install in frontend/",
      );
    }
  });
}
