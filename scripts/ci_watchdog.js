"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable */
const action_1 = require("@octokit/action");
const node_child_process_1 = require("node:child_process");
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const octo = new action_1.Octokit();
const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
const WINDOW_HOURS = 4;
const MIN_HITS = 5;
const MAX_RUNS = 25;
const sinceIso = new Date(Date.now() - WINDOW_HOURS * 3600_000).toISOString();
async function main() {
  const runs = await octo.paginate(octo.rest.actions.listWorkflowRunsForRepo, {
    owner,
    repo,
    per_page: 100,
    status: "failure",
    event: "pull_request",
    created: `>${sinceIso}`,
  });
  const clusters = {};
  for (const r of runs.slice(0, MAX_RUNS)) {
    const log = await octo.rest.actions.downloadWorkflowRunLogs({
      owner,
      repo,
      run_id: r.id,
      request: { raw: true },
    });
    const firstLine =
      Buffer.from(log.data).toString("utf8").split("\n").find(Boolean) ??
      "unknown error";
    const key = firstLine.trim().slice(0, 120);
    clusters[key] ??= { msg: key, runs: [], prs: [] };
    clusters[key].runs.push(r.id);
    clusters[key].prs.push(r.pull_requests?.[0]?.number ?? -1);
  }
  const systemic = Object.values(clusters).filter(
    (c) => c.prs.length >= MIN_HITS,
  );
  if (!systemic.length) {
    console.log("No systemic failure detected");
    return;
  }
  for (const cluster of systemic) {
    const slug = cluster.msg
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 40);
    await handleCluster(slug, cluster);
  }
}
async function handleCluster(slug, cluster) {
  const branch = `ci/auto-fix/${slug}`;
  const issueTitle = `CI auto-fix: ${cluster.msg}`;
  let changed = false;
  if (cluster.msg.includes("npm ci can only install packages")) {
    console.log("Patching npm ci → npm install");
    changed ||= await patchFiles(
      /npm ci --no-audit --no-fund/g,
      "npm install --no-audit --no-fund",
    );
  }
  if (cluster.msg.includes("netlify/actions@")) {
    console.log("Fixing Netlify action path");
    changed ||= await patchFiles(
      /uses:\s*netlify\/actions@v(\d+)/g,
      "uses: netlify/actions/cli@v$1",
    );
  }
  if (cluster.msg.includes("Unauthorized: could not retrieve project")) {
    console.log("Adding secret guard to Netlify step");
    changed ||= await patchFiles(
      /netlify deploy [^\n]+/g,
      `if [[ -n "$NETLIFY_AUTH_TOKEN" && -n "$NETLIFY_SITE_ID" ]]; then
  netlify deploy --dir=. --site $NETLIFY_SITE_ID --auth $NETLIFY_AUTH_TOKEN --json > deploy.json
  echo "PREVIEW_URL=$(jq -r '.deploy_url' deploy.json)" >> $GITHUB_ENV
else
  echo "ℹ️ Skipping Netlify deploy – secrets missing"
fi`,
    );
  }
  if (!changed) {
    console.log("No recipe matched, just filing issue/comments");
    await upsertIssue(issueTitle, cluster);
    await commentOnPRs(cluster);
    return;
  }
  (0, node_child_process_1.execSync)(`git checkout -B ${branch}`);
  (0, node_child_process_1.execSync)('git config user.name "ci-watchdog[bot]"');
  (0, node_child_process_1.execSync)(
    'git config user.email "ci-watchdog@users.noreply.github.com"',
  );
  (0, node_child_process_1.execSync)(
    'git commit -am "ci: auto-fix systemic failure"',
  );
  (0, node_child_process_1.execSync)(`git push -f origin ${branch}`);
  await octo.rest.pulls.create({
    owner,
    repo,
    head: branch,
    base: "main",
    title: `ci: auto-fix for "${cluster.msg}"`,
    body: "This PR was opened automatically by the CI watchdog.",
  });
}
async function patchFiles(pattern, replacement) {
  const files = [
    "Dockerfile",
    ...(await globWalk(".github/workflows", ".yml")),
  ];
  let altered = false;
  for (const f of files) {
    const txt = await promises_1.default.readFile(f, "utf8");
    if (pattern.test(txt)) {
      await promises_1.default.writeFile(f, txt.replace(pattern, replacement));
      altered = true;
    }
  }
  return altered;
}
async function globWalk(dir, ext, out = []) {
  for (const e of await promises_1.default.readdir(dir, {
    withFileTypes: true,
  })) {
    const p = node_path_1.default.join(dir, e.name);
    if (e.isDirectory()) {
      await globWalk(p, ext, out);
    } else if (e.name.endsWith(ext)) {
      out.push(p);
    }
  }
  return out;
}
async function upsertIssue(title, cluster) {
  const { data: issues } = await octo.rest.issues.listForRepo({
    owner,
    repo,
    state: "open",
    labels: "ci-watchdog",
  });
  const existing = issues.find((i) => i.title === title);
  const body = `Detected **${cluster.prs.length} PRs** failing with:\n\n\`\`\`\n${cluster.msg}\n\`\`\``;
  if (existing) {
    await octo.rest.issues.update({
      owner,
      repo,
      issue_number: existing.number,
      body,
    });
  } else {
    await octo.rest.issues.create({
      owner,
      repo,
      title,
      body,
      labels: ["ci-watchdog"],
    });
  }
}
async function commentOnPRs(cluster) {
  for (const pr of new Set(cluster.prs)) {
    if (pr < 0) continue;
    await octo.rest.issues.createComment({
      owner,
      repo,
      issue_number: pr,
      body: `Heads-up 🚦 — CI is currently failing on **all PRs** with:\n\`\`\`\n${cluster.msg}\n\`\`\`\nA fix is being prepared automatically.`,
    });
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
