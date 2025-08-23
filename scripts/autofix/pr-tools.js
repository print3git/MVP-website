import { Octokit } from "@octokit/rest";
import { execSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const [owner, repo] = (process.env.GITHUB_REPOSITORY || "").split("/");

export function slugFromSignature(sig) {
  return crypto
    .createHash("sha1")
    .update(sig.trim().toLowerCase())
    .digest("hex")
    .slice(0, 8);
}

export function getOctokit() {
  return new Octokit({ auth: process.env.GITHUB_TOKEN });
}

export function ensureBranch(branch, base) {
  execSync(`git fetch origin ${base}`, { stdio: "ignore" });
  execSync(`git checkout -B ${branch} origin/${base}`, { stdio: "ignore" });
}

export function commitFiles(files, message) {
  for (const f of files) {
    fs.mkdirSync(path.dirname(f.path), { recursive: true });
    fs.writeFileSync(f.path, f.contents);
  }
  execSync("git add " + files.map((f) => f.path).join(" "), {
    stdio: "ignore",
  });
  execSync(`git commit -m "${message}"`, { stdio: "ignore" });
}

export async function openPR({ branch, base, title, body, labels = [] }) {
  const octokit = getOctokit();
  const { data: pr } = await octokit.pulls.create({
    owner,
    repo,
    head: branch,
    base,
    title,
    body,
  });
  if (labels.length) {
    await octokit.issues.addLabels({
      owner,
      repo,
      issue_number: pr.number,
      labels,
    });
  }
  return pr;
}

export async function findExistingPR(slug) {
  const octokit = getOctokit();
  const q = `repo:${owner}/${repo} ${slug} in:title state:open type:pr`;
  const { data } = await octokit.search.issuesAndPullRequests({ q });
  return data.items[0];
}
