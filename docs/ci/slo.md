# CI start rate SLO

This document describes how the CI start-rate SLO is computed and how to tune the watchdog thresholds.

## Calculation

The watchdog aggregates `ci-metrics` artifacts over a sliding window (default 120 minutes). For each artifact it sums the number of queued and started jobs. The start rate is computed as:

```
start_rate = started_jobs / queued_jobs * 100
```

## Alerting

An alert is triggered when both conditions are met:

- `start_rate` falls below 95%.
- Total queued jobs within the window is at least `min_samples` (default 10).

Alerts are suppressed for branches other than `dev` and `00000production`. A cooldown of `cooldown_minutes` (default 180) prevents duplicate issue comments during the window.

## Tuning

The workflow exposes three inputs:

- `window_minutes` – size of the evaluation window in minutes (default 120).
- `min_samples` – minimum job count required before evaluating the SLO (default 10).
- `cooldown_minutes` – minimum minutes between issue updates (default 180).

Adjust these inputs when invoking the workflow via `workflow_call` to make the watchdog more or less sensitive.
