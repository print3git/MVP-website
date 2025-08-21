const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const wfDir = path.join(process.cwd(), ".github", "workflows");

test("dist output path matches workflow expectations", () => {
  if (!fs.existsSync(wfDir)) return test.skip("no workflows");
  let expectsDist = false;
  for (const file of fs.readdirSync(wfDir)) {
    if (!file.endsWith(".yml") && !file.endsWith(".yaml")) continue;
    const content = fs.readFileSync(path.join(wfDir, file), "utf8");
    if (
      content.includes("frontend/dist/index.html") ||
      content.includes("'dist/index.html")
    ) {
      expectsDist = true;
      break;
    }
  }
  if (!expectsDist) return test.skip("workflows do not check dist outputs");

  const frontendDir = path.join(process.cwd(), "frontend");
  if (!fs.existsSync(frontendDir)) {
    return assert.fail(
      "Workflows expect frontend/dist/index.html but frontend/ directory is missing. Fix: update workflows or add frontend project.",
    );
  }
  const configFiles = fs
    .readdirSync(frontendDir)
    .filter((f) => f.startsWith("vite.config"));
  let outDir = "dist";
  if (configFiles.length) {
    const cfg = fs.readFileSync(path.join(frontendDir, configFiles[0]), "utf8");
    const m = cfg.match(/outDir\s*:\s*['"]([^'"\n]+)['"]/);
    if (m) outDir = m[1];
  }
  if (outDir !== "dist") {
    assert.fail(
      `Workflow expects frontend/dist/index.html but vite config outputs to ${outDir}. Fix: align outDir or workflow.`,
    );
  }
  const viteBin = path.join(frontendDir, "node_modules", ".bin", "vite");
  if (!fs.existsSync(viteBin)) {
    assert.fail(
      "Workflow expects frontend/dist/index.html but vite not installed. Fix: add vite to frontend devDependencies or adjust workflow.",
    );
  }
});
