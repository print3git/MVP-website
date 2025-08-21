const { test } = require("node:test");
const fs = require("fs/promises");

async function appendSummary(message) {
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (!summary) return;
  await fs.appendFile(summary, `${message}\n`);
}

function getAuthHeaders() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "pipeline-deadlock-check",
  };
}

test("pipeline deadlock diagnostics", async () => {
  const repo = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  const headers = getAuthHeaders() || {};
  const api = process.env.GITHUB_API_URL || "https://api.github.com";
  const errors = [];

  if (!repo || !runId) {
    await appendSummary("Pipeline deadlock check skipped: missing GitHub env");
    return;
  }

  // 1. verify build artifacts exist before deploy jobs
  try {
    const runUrl = `${api}/repos/${repo}/actions/runs/${runId}`;
    const [runRes, jobsRes, artRes] = await Promise.all([
      fetch(runUrl, { headers }),
      fetch(`${runUrl}/jobs?per_page=100`, { headers }),
      fetch(`${runUrl}/artifacts?per_page=100`, { headers }),
    ]);
    if (!runRes.ok || !jobsRes.ok || !artRes.ok) {
      throw new Error("Failed to query Actions API");
    }
    const run = await runRes.json();
    const jobs = (await jobsRes.json()).jobs || [];
    const artifacts = (await artRes.json()).artifacts || [];

    if (artifacts.length === 0) {
      errors.push("No build artifacts found for this run");
    }

    const buildJobs = jobs.filter((j) => /build/i.test(j.name));
    const deployJobs = jobs.filter((j) => /deploy/i.test(j.name));
    for (const deploy of deployJobs) {
      const hasPriorBuild = buildJobs.some(
        (b) =>
          b.status === "completed" &&
          b.conclusion === "success" &&
          new Date(b.completed_at) <= new Date(deploy.started_at || Date.now()),
      );
      if (!hasPriorBuild) {
        errors.push(`Deploy job ${deploy.name} started before build completed`);
      }
    }

    // 2. find queued/stuck jobs >7 minutes
    const now = Date.now();
    const workflowRunsRes = await fetch(
      `${api}/repos/${repo}/actions/workflows/${run.workflow_id}/runs?status=in_progress&per_page=10`,
      { headers },
    );
    let otherRuns = [];
    if (workflowRunsRes.ok) {
      const data = await workflowRunsRes.json();
      otherRuns = (data.workflow_runs || []).filter((r) => r.id !== run.id);
    }

    for (const job of jobs) {
      if (job.status !== "queued") continue;
      const queuedAt = new Date(job.created_at).getTime();
      const minutes = (now - queuedAt) / 60000;
      if (minutes > 7) {
        const reason = otherRuns.length ? "concurrency" : "runner shortage";
        errors.push(
          `Job ${job.name} queued for ${minutes.toFixed(
            1,
          )}m (${reason}). ${job.html_url}`,
        );
      }
    }
  } catch (err) {
    await appendSummary(`Pipeline deadlock check skipped: ${err.message}`);
    return;
  }

  if (errors.length) {
    await appendSummary(
      `### Pipeline deadlock issues\n${errors.map((e) => `- ${e}`).join("\n")}`,
    );
    throw new Error(errors.join("; "));
  }
  await appendSummary("### Pipeline deadlock check\nAll checks passed.");
});
