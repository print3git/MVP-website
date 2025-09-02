# Offline-friendly CI

Our CI uses a two-phase dependency strategy so build and test jobs can run without external network access.

## How it works

1. **Deps job**: runs with network access, installs root and backend dependencies with `npm ci`, and downloads Playwright browsers. The npm cache (`~/.npm`) and Playwright browsers (`~/.cache/ms-playwright`) are saved.
2. **Build/Test jobs**: restore the caches. If the npm cache is missing and no network is reachable, the job fails fast with a clear error. When offline but caches exist, npm runs in offline mode and Playwright uses the cached browser.

## Environment variables

These variables can point the build at a private registry or HTTPS proxy:

- `NPM_REGISTRY` – npm registry URL (defaults to https://registry.npmjs.org/)
- `HTTP_PROXY` / `HTTPS_PROXY` – proxy URLs
- `NPM_STRICT_SSL` – set to `false` to disable TLS verification

## Refreshing caches

Caches are keyed on the Node version and lockfiles. Bumping `package-lock.json` or the key in the CI workflow forces a refresh.
