#!/usr/bin/env bash
set -euo pipefail

echo "==> Prime root deps"
npm ci

echo "==> Prime backend deps"
pushd backend
npm ci
popd

# Install playwright browsers to a shared path so later jobs can run offline
export PLAYWRIGHT_BROWSERS_PATH="${HOME}/.cache/ms-playwright"
npx playwright install --with-deps chromium
