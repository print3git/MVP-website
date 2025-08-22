# CI Canary

Proves a self-hosted runner starts quickly.

- Runs every 30 minutes and on demand via `workflow_dispatch`.
- Targets labels `self-hosted`, `linux`, `x64`, and `aws-runner`.
- Uses a composite action that calls the GitHub API for `workflow_job` data.
- Computes the time from `queued_at` to `started_at`.
- Fails if latency exceeds `CI_SLO_START_SECONDS` (default 120s).
- Override the SLO by passing `threshold_seconds` input on dispatch.
- If no matching runner exists, the canary job is skipped harmlessly.
- A `control-ubuntu` job runs on `ubuntu-latest` to show the repo builds.
- The canary step uploads a `canary-timings` artifact.
- Download the artifact to inspect measured timings in the summary.
- When dispatched from a pull request, the workflow comments the latency.
- Useful for catching runner outages or misconfigured labels early.
- Environment variables:
  - `CI_SLO_START_SECONDS` — override default start latency SLO.
- Artifacts live under the run's "Artifacts" section in GitHub Actions.
- Delete old artifacts to keep the repository tidy.
