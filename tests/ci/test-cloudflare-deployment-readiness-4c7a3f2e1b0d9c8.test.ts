import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import yaml from "yaml";

function getOutputDir() {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const deployYaml = path.join(repoRoot, ".github", "workflows", "deploy.yml");
  if (fs.existsSync(deployYaml)) {
    try {
      const doc = yaml.parse(fs.readFileSync(deployYaml, "utf8"));
      const steps = doc?.jobs?.deploy?.steps ?? [];
      for (const step of steps) {
        if (step?.with?.directory) {
          return path.resolve(repoRoot, step.with.directory);
        }
      }
    } catch {
      /* ignore parse errors */
    }
  }
  const candidates = ["dist", "build", "public"];
  for (const c of candidates) {
    const abs = path.join(repoRoot, c);
    if (fs.existsSync(abs)) return abs;
  }
  return repoRoot;
}

function scan(dir, problems, base = dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(base, full);
    const invalid = /[<>:"?*]|[\r\n]/.test(entry.name);
    try {
      fs.accessSync(full, fs.constants.R_OK);
    } catch {
      problems.push(`Unreadable: ${rel}`);
    }
    if (invalid) {
      problems.push(`Invalid name: ${rel}`);
    }
    if (entry.isSymbolicLink()) {
      try {
        const target = fs.readlinkSync(full);
        const resolved = path.resolve(path.dirname(full), target);
        if (!fs.existsSync(resolved)) {
          problems.push(`Broken symlink: ${rel} -> ${target}`);
        }
      } catch {
        problems.push(`Broken symlink: ${rel}`);
      }
    }
    if (entry.isDirectory()) {
      scan(full, problems, base);
    }
  }
}

describe("cloudflare deployment readiness", () => {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const outputDir = getOutputDir();

  test("build succeeds and output valid", () => {
    execSync("npm run build", { cwd: repoRoot, stdio: "inherit" });
    expect(fs.existsSync(outputDir)).toBe(true);
    const entries = fs.readdirSync(outputDir);
    expect(entries.length).toBeGreaterThan(0);
    const problems = [];
    scan(outputDir, problems);
    if (problems.length) {
      console.error("Deployment readiness issues:\n" + problems.join("\n"));
    }
    expect(problems).toHaveLength(0);
  });
});
