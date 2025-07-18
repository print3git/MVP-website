import { execSync } from "child_process";
import { existsSync, mkdirSync, readdirSync, copyFileSync } from "fs";
import path from "path";

const root = process.cwd();
const outDir = path.join(root, "build");

/**
 * Execute the project's build script.
 * @returns {void}
 */
function runBuild() {
  try {
    execSync("npm run build", { stdio: "inherit" });
  } catch (err) {
    console.error("Build command failed:", err);
    process.exit(1);
  }
}

/**
 * Check if the given directory contains any files.
 * @param {string} dir directory path to inspect
 * @returns {boolean} whether the directory contains files
 */
function hasFiles(dir) {
  return existsSync(dir) && readdirSync(dir).length > 0;
}

/**
 * Copy root static assets to the build directory as a fallback.
 * Ensures Cloudflare has something to deploy when the build step outputs
 * nothing.
 */
function copyStaticFallback() {
  mkdirSync(outDir, { recursive: true });
  const exts = /\.(html?|css|js|json|png|jpe?g|gif|svg|ico)$/i;
  for (const file of readdirSync(root)) {
    if (exts.test(file)) {
      copyFileSync(path.join(root, file), path.join(outDir, file));
    }
  }
}

runBuild();
if (!hasFiles(outDir)) {
  console.warn(`Build output not found in ${outDir}, copying static files.`);
  copyStaticFallback();
}
console.log("Frontend build prepared at", outDir);
