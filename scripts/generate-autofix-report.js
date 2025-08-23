#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

async function fetchStats() {
  const repoEnv = process.env.GITHUB_REPOSITORY;
  let repo = repoEnv;
  if (!repo) {
    try {
      const { execSync } = require("child_process");
      const remote = execSync("git config --get remote.origin.url", {
        encoding: "utf8",
      }).trim();
      const match = remote.match(/github.com[:/](.+)\.git$/);
      if (match) repo = match[1];
    } catch {
      // ignore
    }
  }
  const [owner, repoName] = (repo || "unknown/unknown").split("/");
  const headers = { "User-Agent": "autofix-report" };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  }
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  async function getJson(url) {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  }
  const repoData = await getJson(
    `https://api.github.com/repos/${owner}/${repoName}`,
  );
  const openIssues = repoData.open_issues_count || 0;
  const newIssuesData = await getJson(
    `https://api.github.com/search/issues?q=repo:${owner}/${repoName}+type:issue+created:>=${since}`,
  );
  const prsOpenedData = await getJson(
    `https://api.github.com/search/issues?q=repo:${owner}/${repoName}+type:pr+created:>=${since}`,
  );
  const prsMergedData = await getJson(
    `https://api.github.com/search/issues?q=repo:${owner}/${repoName}+type:pr+is:merged+merged:>=${since}`,
  );
  const prsClosedData = await getJson(
    `https://api.github.com/search/issues?q=repo:${owner}/${repoName}+type:pr+is:closed+closed:>=${since}`,
  );
  return {
    openIssues,
    newIssues: newIssuesData.total_count || 0,
    prsOpened: prsOpenedData.total_count || 0,
    prsMerged: prsMergedData.total_count || 0,
    prsClosed: prsClosedData.total_count || 0,
  };
}

function generateReport(stats) {
  return `# Autofix Report\n\nGenerated at: ${new Date().toISOString()}\n\n| Metric | Count |\n| --- | ---: |\n| Open issues | ${stats.openIssues} |\n| New issues | ${stats.newIssues} |\n| PRs opened | ${stats.prsOpened} |\n| PRs merged | ${stats.prsMerged} |\n| PRs closed | ${stats.prsClosed} |\n`;
}

async function main() {
  let stats;
  try {
    stats = await fetchStats();
  } catch (err) {
    console.error("Failed to fetch stats", err);
    stats = {
      openIssues: 0,
      newIssues: 0,
      prsOpened: 0,
      prsMerged: 0,
      prsClosed: 0,
    };
  }
  const report = generateReport(stats);
  const outDir = path.join(process.cwd(), "ci", "autofix");
  await fs.promises.mkdir(outDir, { recursive: true });
  await fs.promises.writeFile(path.join(outDir, "report.md"), report);
}

if (require.main === module) {
  main();
}

module.exports = { generateReport };
