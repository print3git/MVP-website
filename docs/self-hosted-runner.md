# Self-hosted Runner

## Prewarm mode

Set `PREWARM=1` to run [`infra/tools/prewarm.sh`](../infra/tools/prewarm.sh) during cloud-init. The script creates npm and pnpm caches, installs Playwright browsers (respecting `INSTALL_PLAYWRIGHT_DEPS`), and prints a timing summary.

## Feature test workflow

The [`Self-hosted Runner Feature Test`](../.github/workflows/selfhosted-featuretest.yml) workflow validates new runner images. Trigger it manually or wait for the nightly schedule. It checks for Node 20 and pnpm, installs dependencies, optionally runs a Playwright smoke test (when the `RUN_PLAYWRIGHT_SMOKE` repository variable is set), and uploads `runner-facts.json` with system details.
