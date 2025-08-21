#!/usr/bin/env bash
set -euo pipefail

# Measure how long a run spent in the GitHub Actions queue.
# Prints the delta between queued_at and run_started_at in milliseconds.
# Never fails the job.
main() {
  if ! command -v gh >/dev/null 2>&1; then
    echo 0
    return
  fi
  run_json=$(gh api "/repos/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}" 2>/dev/null) || {
    echo 0
    return
  }
  queued=$(echo "$run_json" | jq -r '.queued_at')
  started=$(echo "$run_json" | jq -r '.run_started_at')
  if [[ -z "$queued" || -z "$started" || "$queued" == "null" || "$started" == "null" ]]; then
    echo 0
    return
  fi
  q_ms=$(date -d "$queued" +%s%3N)
  s_ms=$(date -d "$started" +%s%3N)
  echo $((s_ms - q_ms))
}

main "$@" || true
