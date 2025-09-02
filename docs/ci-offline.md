# Offline-friendly CI

This project primes npm packages and Playwright browsers in a dedicated `deps`
job. When network access is unavailable, downstream jobs run with
`NPM_CONFIG_OFFLINE=true` and reuse the cached artifacts.

## Priming caches

The `deps` job runs `scripts/ci/prime-deps.sh` to install root and backend
packages and to download the Chromium browser. Results are stored in the
standard npm cache directory and `~/.cache/ms-playwright`.

## Using a proxy or private registry

Set the following environment variables to point at a custom registry or proxy:

- `NPM_REGISTRY`
- `HTTP_PROXY`
- `HTTPS_PROXY`

## Refreshing caches

Bump the lockfiles or change the cache key in the workflow to force a refresh.
