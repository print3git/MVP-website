import { Octokit } from "@octokit/action";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import path from "node:path";

const octo = new Octokit();
const repoSlug = process.env.GITHUB_REPOSITORY || "";
const [owner, repo] = repoSlug.split("/");

// --- parameters ---
const WINDOW_HOURS = 4;
const MIN_HITS     = 5;
const MAX_RUNS     = 25;

// helper
const sinceIso = new Date(Date.now() - WINDOW_HOURS * 3600_000).toISOString();

type Cluster = { msg: string; runs: number[]; prs: number[] };

async function main() {
  const runs = await octo.paginate(octo.rest.actions.listWorkflowRunsForRepo, {
    owner, repo, per_page: 100, status: "failure", event: "pull_request", created: `>${sinceIso}`
  });

  const clusters: Record<string, Cluster> = {};

  for (const r of runs.slice(0, MAX_RUNS)) {
    const log = await octo.rest.actions.downloadWorkflowRunLogs({
      owner, repo, run_id: r.id, request: { raw: true }
    });
    const firstLine = Buffer.from(log.data as ArrayBuffer)
      .toString("utf8")
      .split("\n")
      .find(Boolean) ?? "unknown error";
    const key = firstLine.trim().slice(0, 120);

    clusters[key] ??= { msg: key, runs: [], prs: [] };
    clusters[key].runs.push(r.id);
    clusters[key].prs.push(r.pull_requests?.[0]?.number ?? -1);
  }

  const systemic = Object.values(clusters).filter(c => c.prs.length >= MIN_HITS);
  if (!systemic.length) {
    console.log("No systemic failure detected");
    return;
  }

  for (const cluster of systemic) {
    const slug = cluster.msg.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    await handleCluster(slug, cluster);
  }
}

async function handleCluster(slug: string, cluster: Cluster) {
  const branch = `ci/auto-fix/${slug}`;
  const issueTitle = `CI auto-fix: ${cluster.msg}`;

  // --- attempt fix recipes ---
  let changed = false;
  if (cluster.msg.includes("npm ci can only install packages")) {
    console.log("Patching npm ci → npm install");
    changed ||= patchFiles(/npm ci --no-audit --no-fund/g,
                           "npm install --no-audit --no-fund");
  }
  if (cluster.msg.includes("Unauthorized: could not retrieve project")) {
    console.log("Adding secret guard to Netlify step");
    changed ||= patchFiles(/netlify deploy [^\n]+/g,
`if [[ -n "$NETLIFY_AUTH_TOKEN" && -n "$NETLIFY_SITE_ID" ]]; then
  netlify deploy --dir=. --site $NETLIFY_SITE_ID --auth $NETLIFY_AUTH_TOKEN --json > deploy.json
  echo "PREVIEW_URL=$(jq -r '.deploy_url' deploy.json)" >> $GITHUB_ENV
else
  echo "ℹ️ Skipping Netlify deploy – secrets missing"
fi`);
  }

  if (!changed) {
    console.log("No recipe matched, just filing issue/comments");
    await upsertIssue(issueTitle, cluster);
    await commentOnPRs(cluster);
    return;
  }

  // Commit branch & PR
  execSync(`git checkout -B ${branch}`);
  execSync('git config user.name "ci-watchdog[bot]"');
  execSync('git config user.email "ci-watchdog@users.noreply.github.com"');
  execSync('git commit -am "ci: auto-fix systemic failure"');
  execSync(`git push -f origin ${branch}`);

  await octo.rest.pulls.create({
    owner, repo,
    head: branch, base: "main",
    title: `ci: auto-fix for "${cluster.msg}"`,
    body: "This PR was opened automatically by the CI watchdog."
  });
}

function patchFiles(pattern: RegExp, replacement: string) {
  const files = ["Dockerfile", ...globWalk(".github/workflows", ".yml")];
  let altered = false;
  for (const f of files) {
    const txt = fs.readFileSync(f, "utf8");
    if (pattern.test(txt)) {
      fs.writeFileSync(f, txt.replace(pattern, replacement));
      altered = true;
    }
  }
  return altered;
}

function globWalk(dir: string, ext: string, out: string[] = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    e.isDirectory() ? globWalk(p, ext, out)
                    : e.name.endsWith(ext) && out.push(p);
  }
  return out;
}

async function upsertIssue(title: string, cluster: Cluster) {
  const { data: issues } = await octo.rest.issues.listForRepo({ owner, repo, state: "open", labels: "ci-watchdog" });
  const existing = issues.find(i => i.title === title);
  const body = `Detected **${cluster.prs.length} PRs** failing with:\n\n\`\`\`\n${cluster.msg}\n\`\`\``;

  if (existing) {
    await octo.rest.issues.update({ owner, repo, issue_number: existing.number, body });
  } else {
    await octo.rest.issues.create({ owner, repo, title, body, labels: ["ci-watchdog"] });
  }
}

async function commentOnPRs(cluster: Cluster) {
  for (const pr of new Set(cluster.prs)) {
    if (pr < 0) continue;
    await octo.rest.issues.createComment({
      owner, repo, issue_number: pr,
      body: `Heads-up 🚦 — CI is currently failing on **all PRs** with:\n\`\`\`\n${cluster.msg}\n\`\`\`\nA fix is being prepared automatically.`
    });
  }
}

main().catch(e => { console.error(e); process.exit(1); });
