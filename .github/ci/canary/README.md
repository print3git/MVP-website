# CI Canary

These utilities monitor CI runner health.

## SLA

- **Target:** self-hosted queue latency under 10s
- **Hard limit:** self-hosted queue latency under 60s
- GitHub-hosted metrics are recorded for comparison.

## Dashboards

The `ci-canary.yml` workflow stores per-run metrics in `history.ndjson` and exposes per-run JSON artifacts. A summary with gauges is written to the workflow summary for quick inspection.

## SLA breach handling

If the self-hosted queue latency exceeds 60s or the job fails to start, a pinned issue titled **CI Canary: SLA breach** is created or updated with the last 10 datapoints.
