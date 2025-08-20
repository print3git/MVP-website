# Contributing Guide

Thank you for helping improve this project! Please follow these steps to keep our history clean and CI green.

## Branches

- Fork the repo and create a feature branch from `dev`.
- Use the pattern `yourname/short-topic`, for example `alice/add-login-tests`.

## Commits

- We use [Conventional Commits](https://www.conventionalcommits.org/) for all commit messages.
- Format each message as `type: short description` (e.g. `fix: handle null user`).
- Allowed types include `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`, `perf`, `ci`, and `build`.

## Pull Requests

1. Run `npm run setup` after checking out the repo. This installs dependencies and Playwright browsers.
2. Format code in `backend/` with `npm run format` and ensure linting passes via `npm run ci`.
3. Execute `npm test` and, if possible, `npm run smoke` before opening the PR.
4. Open a PR against the `dev` branch and request review.

## Tests

- All new code should include appropriate tests.
- CI runs `npm run ci` and `npm test`; please ensure these succeed locally.
- If Playwright dependencies are already installed you can set `SKIP_PW_DEPS=1` when running setup or CI to skip the lengthy install step.
- Mock all external HTTP calls in tests. Only `localhost` traffic is permitted; any other network access must be stubbed with tools like [nock](https://github.com/nock/nock).

## How to run tests / lint / coverage / smoke

Run the following commands from the repository root:

```bash
npm run lint      # check code style
npm test          # execute unit tests
npm run coverage  # generate coverage report
SKIP_PW_DEPS=1 npm run smoke  # run the Playwright smoke test
```

## Watchdog warnings

Jest includes a watchdog that reports when a test leaves timers or other handles
running. If you see an output similar to:

```
Jest did not exit one second after the test run has completed.
```

it means a handle was left open and the watchdog aborted the run. Clean up
lingering intervals, timeouts, or servers in your tests before re-running.
