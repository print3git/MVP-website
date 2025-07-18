/* eslint-disable */
import { execSync } from "child_process";
import * as yaml from "yaml";

const branches = ["main", "dev", "production"];
const requiredSteps = ["coverage", "test", "lint"];

function listWorkflows(branch: string): string[] {
  const output = execSync(
    `git ls-tree -r --name-only ${branch} .github/workflows`,
    { encoding: "utf8" },
  ).trim();
  if (!output) return [];
  return output.split("\n").filter((f) => f.endsWith(".yml"));
}

function readFileFromBranch(branch: string, file: string): string {
  return execSync(`git show ${branch}:${file}`, { encoding: "utf8" });
}

function checkSteps(content: string, file: string) {
  const doc = yaml.parse(content);
  const jobs = doc.jobs || {};
  const names: string[] = [];
  for (const job of Object.values(jobs) as any[]) {
    if (Array.isArray(job.steps)) {
      for (const step of job.steps) {
        if (step && step.name) names.push(String(step.name).toLowerCase());
      }
    }
  }
  for (const step of requiredSteps) {
    if (!names.some((n) => n.includes(step))) {
      throw new Error(`Workflow ${file} missing required step '${step}'`);
    }
  }
}

function compareBranches(
  refBranch: string,
  branch: string,
  files: string[],
  refContents: Record<string, string>,
) {
  const otherFiles = listWorkflows(branch);
  if (files.sort().join(",") !== otherFiles.sort().join(",")) {
    throw new Error(`Workflow files differ between ${refBranch} and ${branch}`);
  }
  for (const file of files) {
    const content = readFileFromBranch(branch, file);
    if (content !== refContents[file]) {
      throw new Error(
        `Workflow ${file} differs between ${refBranch} and ${branch}`,
      );
    }
    checkSteps(content, file);
  }
}

const referenceFiles = listWorkflows(branches[0]);
const referenceContents: Record<string, string> = {};
for (const file of referenceFiles) {
  const content = readFileFromBranch(branches[0], file);
  referenceContents[file] = content;
  checkSteps(content, file);
}

for (const branch of branches.slice(1)) {
  compareBranches(branches[0], branch, referenceFiles, referenceContents);
}

console.log(
  "All workflows are synchronized across branches and contain required steps.",
);
