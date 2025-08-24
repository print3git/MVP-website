# AWS Runner Diagnostics

This workflow validates the health of the `mvp-gh-runner` self-hosted runner.

## Running

- Manual run: **Actions → AWS self-hosted runner diagnostics → Run workflow**.
- Scheduled: every 15 minutes via cron.

## What it does

1. Queries the GitHub API to ensure the runner is registered and online.
2. Launches a job on the self-hosted runner that performs the following checks:
   - Runner identity and expected labels.
   - Start latency from queue time.
   - Disk space, CPU and memory inventory.
   - Network egress to GitHub and npm.
   - Docker availability and ability to run containers.
   - Node.js and package manager versions.
   - Artifact upload/download round‑trip.
   - Amazon SSM agent presence.
   - Basic parallelism probe and cancellation handling.
3. Aggregates metrics and emits a markdown summary with pass/fail indicators.

Artifacts include `registry.json`, `checks.ndjson`, and `metrics.json` under `ci/runner/`.
These record raw API data, individual check results, and key metrics such as queue latency
and disk space. The `thresholds` job validates critical metrics and only fails when the
runner is offline, startup latency exceeds one minute, or the artifact round‑trip check fails.

Review the job summary for a quick pass/fail table and detailed metrics.
