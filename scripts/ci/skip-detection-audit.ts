import fs from "node:fs/promises";

export interface Job {
  name: string;
  conclusion: string | null;
  [key: string]: unknown;
}

export function auditSkips(jobs: Job[], allowed: string[]): string[] {
  const allowedSet = new Set(allowed);
  return jobs
    .filter((j) => j.conclusion === "skipped")
    .map((j) => j.name)
    .filter((name) => !allowedSet.has(name));
}

async function loadAllowed(
  file = "config/allowed-skips.json",
): Promise<string[]> {
  try {
    const txt = await fs.readFile(file, "utf8");
    const data = JSON.parse(txt);
    return Array.isArray(data.allowed) ? data.allowed : [];
  } catch {
    return [];
  }
}

async function fetchJobs(
  runId: string,
  repo: string,
  token?: string,
): Promise<Job[]> {
  const url = `https://api.github.com/repos/${repo}/actions/runs/${runId}/jobs?per_page=100`;
  const res = await fetch(url, {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch jobs: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return Array.isArray(data.jobs) ? data.jobs : [];
}

async function main(): Promise<void> {
  const runId = process.env.GITHUB_RUN_ID;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!runId || !repo) {
    console.error("Missing GITHUB_RUN_ID or GITHUB_REPOSITORY");
    process.exit(1);
  }
  const allowed = await loadAllowed();
  const jobs = await fetchJobs(runId, repo, process.env.GITHUB_TOKEN);
  const unexpected = auditSkips(jobs, allowed);
  if (unexpected.length) {
    console.error(
      "Unexpected skipped jobs detected:\n" + unexpected.join("\n"),
    );
    process.exit(1);
  }
  console.log("No unexpected skipped jobs");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
