import fs from "fs";
import path from "path";
import axios from "axios";

interface Job {
  name: string;
  conclusion: string | null;
}

export function getUnexpectedSkippedJobs(
  jobs: Job[],
  allowed: string[],
): string[] {
  const skipped = jobs
    .filter((j) => j.conclusion === "skipped")
    .map((j) => j.name);
  return skipped.filter((name) => !allowed.includes(name));
}

export async function fetchJobs(
  runId: string,
  repo: string,
  token?: string,
): Promise<Job[]> {
  const url = `https://api.github.com/repos/${repo}/actions/runs/${runId}/jobs?per_page=100`;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "skip-detection-audit",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const resp = await axios.get(url, { headers });
  return resp.data?.jobs || [];
}

async function main() {
  const runId = process.env.GITHUB_RUN_ID;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!runId || !repo) {
    console.error("GITHUB_RUN_ID and GITHUB_REPOSITORY must be set");
    process.exit(1);
  }
  const token = process.env.GITHUB_TOKEN;
  const jobs = await fetchJobs(runId, repo, token);
  const configPath = path.resolve(__dirname, "../../config/allowed-skips.json");
  const allowedCfg = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
    allowed?: string[];
  };
  const allowed = allowedCfg.allowed || [];
  const unexpected = getUnexpectedSkippedJobs(jobs, allowed);
  if (unexpected.length > 0) {
    console.error(`Unexpected skipped jobs detected: ${unexpected.join(", ")}`);
    process.exit(1);
  }
  console.log("No unexpected skipped jobs.");
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { main };
