const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");

async function fetchJSON(url, token) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "autofix-harvest",
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

async function fetchLog(url, token) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "autofix-harvest",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`Log request failed: ${res.status}`);
  const array = await res.arrayBuffer();
  return zlib.gunzipSync(Buffer.from(array)).toString("utf8");
}

function lastLines(text, count) {
  const lines = text.trimEnd().split(/\r?\n/);
  return lines.slice(-count).join("\n");
}

function normalizeError(text) {
  return text.replace(/[0-9]+/g, "#");
}

function extractFiles(text) {
  const files = new Set();
  const regex = /([A-Za-z0-9_\/\.-]+\.\w+)/g;
  let m;
  while ((m = regex.exec(text))) {
    files.add(m[1]);
  }
  return [...files];
}

function processLog({ runId, job }, log) {
  const snippet = lastLines(log, 400);
  const normalized = normalizeError(snippet);
  const hash = crypto.createHash("sha256").update(normalized).digest("hex");
  const files = extractFiles(snippet);
  const data = {
    run: runId,
    job: job.name || job,
    files,
    snippets: [snippet],
    error_hash: hash,
  };
  const dir = path.join("ci", "autofix", "inbox");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${runId}-${job.id || job}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return data;
}

async function harvest() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  const runId = process.env.RUN_ID || process.env.GITHUB_RUN_ID;
  if (!token || !repo || !runId) {
    console.error("Missing required environment variables");
    process.exit(1);
  }
  const apiBase = `https://api.github.com/repos/${repo}`;
  const jobs = await fetchJSON(
    `${apiBase}/actions/runs/${runId}/jobs?per_page=100`,
    token,
  );
  for (const job of jobs.jobs || []) {
    if (job.conclusion === "success") continue;
    const log = await fetchLog(`${apiBase}/actions/jobs/${job.id}/logs`, token);
    processLog({ runId, job }, log);
  }
}

module.exports = { harvest, processLog, normalizeError };

if (require.main === module) {
  harvest().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
