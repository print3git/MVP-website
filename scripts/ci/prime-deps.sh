#!/usr/bin/env bash
set -euo pipefail

echo "==> Prime root deps"
npm ci

echo "==> Prime backend deps"
pushd backend
npm ci
popd

export PLAYWRIGHT_BROWSERS_PATH="${HOME}/.cache/ms-playwright"
npx playwright install-deps chromium
npx playwright install chromium
