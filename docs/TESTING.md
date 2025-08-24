# Testing Guide

This project provides scripts for running the Jest unit suite, the Playwright smoke tests and for generating coverage reports.

## Running unit tests

Use the `test` script at the repository root. It runs the backend Jest suite.

```bash
npm test
# or with pnpm
pnpm test
```

If Playwright dependencies are not installed the pretest hook will attempt to fetch them. Set `SKIP_PW_DEPS=1` when they are already present to skip that step.

## Running smoke tests

The `smoke` script starts the dev server and executes the Playwright smoke test. This confirms that the basic login and checkout flows still work.

```bash
npm run smoke
```

Like the unit tests, you can set `SKIP_PW_DEPS=1` if browsers were installed previously.

## Generating coverage

Run the `coverage` script from the repository root to produce coverage reports. The script stores the LCOV data under `coverage/lcov.info` and writes a summary JSON file under `backend/coverage/coverage-summary.json`.

```bash
npm run coverage
```

## Interpreting `coverage-summary.json`

The summary JSON contains overall metrics under the `total` key and per-file statistics for lines, statements, functions and branches. Each metric provides the number of items covered and the overall percentage. Open the file and inspect the `total` section to see the project's current coverage level.

```json
{
  "total": {
    "lines": { "total": 3588, "covered": 517, "pct": 14.4 },
    "statements": { "total": 3763, "covered": 522, "pct": 13.87 },
    "functions": { "total": 428, "covered": 22, "pct": 5.14 },
    "branches": { "total": 1612, "covered": 123, "pct": 7.63 }
  },
  "...": {}
}
```

Higher percentages indicate better test coverage.
