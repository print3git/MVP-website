# Concurrency guards

GitHub Actions lets you prevent duplicate workflow runs with [concurrency](https://docs.github.com/actions/using-jobs/using-concurrency). A concurrency **group** defines when runs should share a lock, and `cancel-in-progress` drops any previous run that still holds the lock.

## Grouping

Use a stable name so that retries or new pushes to the same branch join the same group:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref_name || github.run_id }}
  cancel-in-progress: false
```

`github.ref_name` resolves to the short branch or tag name, keeping the group readable. The `github.run_id` fallback ensures the workflow still runs for events that lack `ref_name`.

## Cancel in progress

If a new commit arrives, you often want to stop any older run for that branch:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref_name }}
  cancel-in-progress: true
```

This configuration keeps only the most recent run active for each branch.

## Pitfalls: `github.ref` vs `github.ref_name`

`github.ref` contains the full ref path such as `refs/heads/main` or `refs/pull/42/merge`, while `github.ref_name` is just `main` or `42/merge`. Mixing the two produces different group names, so workflows may not cancel each other as expected. Using `github.ref` with pull requests can also yield unique values per commit (`refs/pull/123/merge`), preventing `cancel-in-progress` from stopping earlier runs. Prefer `github.ref_name` (or `github.head_ref` for pull requests) to keep group names consistent across events.
