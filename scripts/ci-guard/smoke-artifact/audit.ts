#!/usr/bin/env node
// @ts-check
import fs from "fs";
import path from "path";
import yaml from "yaml";
import toml from "toml";

function readWrangler(summary: any) {
  try {
    const wranglerPath = path.join(process.cwd(), "wrangler.toml");
    const content = fs.readFileSync(wranglerPath, "utf8");
    const cfg = toml.parse(content);
    const pages = (cfg as any).pages || {};
    const wSummary = { ok: true, errors: [] as string[] };
    if (!pages.pages_build_output_dir) {
      wSummary.ok = false;
      wSummary.errors.push("missing [pages].pages_build_output_dir");
    }
    summary.wrangler = wSummary;
    if (!wSummary.ok) summary.ok = false;
  } catch (e) {
    summary.wrangler = { ok: false, errors: ["missing wrangler.toml"] };
    summary.ok = false;
  }
}

function stepRefsDist(step: any): boolean {
  if (!step) return false;
  if (typeof step.run === "string" && step.run.includes("frontend/dist"))
    return true;
  if (
    step.with &&
    typeof step.with.path === "string" &&
    step.with.path.includes("frontend/dist")
  )
    return true;
  return false;
}

function auditFiles(files: string[]) {
  const summary: any = {
    ok: true,
    files: {},
    wrangler: { ok: true, errors: [] as string[] },
  };
  readWrangler(summary);
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const doc = yaml.parse(content) || {};
    const jobs = doc.jobs || {};
    const fileSummary: any = { ok: true, jobs: {} };
    for (const [jobName, job] of Object.entries<any>(jobs)) {
      const steps: any[] = Array.isArray(job.steps) ? job.steps : [];
      const jobSummary: any = { ok: true, errors: [] as string[] };
      const stepTexts = steps.map((s) => JSON.stringify(s));
      const referencesDist = stepTexts.some(
        (t) => t && t.includes("frontend/dist"),
      );
      if (!referencesDist) {
        fileSummary.jobs[jobName] = jobSummary;
        continue;
      }
      const firstDistIdx = steps.findIndex(stepRefsDist);
      const downloadIdx = steps.findIndex(
        (s) =>
          typeof s.uses === "string" &&
          s.uses.includes("actions/download-artifact") &&
          s.with &&
          typeof s.with.name === "string" &&
          /^frontend-dist/.test(String(s.with.name)) &&
          s.with.path &&
          String(s.with.path).includes("frontend/dist"),
      );
      const buildIdx = steps.findIndex(
        (s) =>
          typeof s.run === "string" &&
          /pnpm\s+(?:-C\s+frontend\s+)?(?:run\s+)?build/.test(s.run),
      );
      if (buildIdx === -1) {
        if (downloadIdx === -1 || downloadIdx > firstDistIdx) {
          jobSummary.ok = false;
          jobSummary.errors.push(
            "missing build or artifact download before use",
          );
        }
        fileSummary.jobs[jobName] = jobSummary;
        if (!jobSummary.ok) fileSummary.ok = summary.ok = false;
        continue;
      }
      const buildStep = steps[buildIdx];
      if (
        !(
          buildStep["working-directory"] === "frontend" ||
          /-C\s+frontend/.test(buildStep.run || "")
        )
      ) {
        jobSummary.ok = false;
        jobSummary.errors.push(
          `step ${buildIdx + 1}: build must run in frontend directory`,
        );
      }
      if (/\bnpm\b/.test(buildStep.run || "")) {
        jobSummary.ok = false;
        jobSummary.errors.push(`step ${buildIdx + 1}: build must use pnpm`);
      }
      const nodeStep = steps
        .slice(0, buildIdx)
        .find(
          (s) =>
            typeof s.uses === "string" &&
            s.uses.startsWith("actions/setup-node") &&
            s.with,
        );
      if (!nodeStep) {
        jobSummary.ok = false;
        jobSummary.errors.push("missing Node 20 setup");
      } else {
        const nodeVersion = String(nodeStep.with["node-version"] || "");
        if (!(nodeVersion.includes("20") || nodeVersion.includes("${{"))) {
          jobSummary.ok = false;
          jobSummary.errors.push("missing Node 20 setup");
        }
        if (nodeStep.with && nodeStep.with.cache !== "pnpm") {
          jobSummary.ok = false;
          jobSummary.errors.push("setup-node cache must be pnpm");
        }
      }
      const corepackIdx = steps.findIndex(
        (s) => typeof s.run === "string" && s.run.trim() === "corepack enable",
      );
      if (corepackIdx === -1 || corepackIdx > buildIdx) {
        jobSummary.ok = false;
        jobSummary.errors.push("missing corepack enable before build");
      }
      const pnpmSetupIdx = steps.findIndex(
        (s) =>
          typeof s.uses === "string" && s.uses.startsWith("pnpm/action-setup"),
      );
      if (pnpmSetupIdx === -1 || pnpmSetupIdx > buildIdx) {
        jobSummary.ok = false;
        jobSummary.errors.push("missing pnpm/action-setup before build");
      }
      const verifyIdx = steps.findIndex(
        (s) =>
          typeof s.run === "string" &&
          s.run.includes("frontend/dist/index.html") &&
          s.run.includes("frontend/dist/models/boombox.glb") &&
          /test\s+-f/.test(s.run),
      );
      if (verifyIdx === -1 || verifyIdx < buildIdx) {
        jobSummary.ok = false;
        jobSummary.errors.push("missing verify step");
      }
      const uploadIdx = steps.findIndex(
        (s, i) =>
          i > buildIdx &&
          typeof s.uses === "string" &&
          s.uses.includes("actions/upload-artifact") &&
          s.with &&
          typeof s.with.name === "string" &&
          /^frontend-dist/.test(String(s.with.name)) &&
          s.with.path &&
          String(s.with.path).includes("frontend/dist"),
      );
      if (uploadIdx === -1) {
        jobSummary.ok = false;
        jobSummary.errors.push("missing artifact upload after build");
      }
      if (!jobSummary.ok) fileSummary.ok = summary.ok = false;
      fileSummary.jobs[jobName] = jobSummary;
    }
    summary.files[file] = fileSummary;
  }
  return summary;
}

function main() {
  const repoRoot = process.cwd();
  const args = process.argv.slice(2);
  let files: string[];
  if (args.length) {
    files = args;
  } else {
    const wfDir = path.join(repoRoot, ".github", "workflows");
    files = fs
      .readdirSync(wfDir)
      .filter((f) => f.endsWith(".yml"))
      .map((f) => path.join(wfDir, f));
  }
  const summary = auditFiles(files);
  const out = path.join(repoRoot, "smoke-artifact-summary.json");
  fs.writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exit(1);
}

if (require.main === module) {
  main();
}

export { auditFiles };
