#!/usr/bin/env bash
set -euo pipefail

echo "==> Prime root deps"
if [ ! -d node_modules ]; then
  npm ci
else
  echo "root node_modules already present"
fi

echo "==> Prime backend deps"
if [ ! -d backend/node_modules ]; then
  pushd backend
  npm ci
  popd
else
  echo "backend node_modules already present"
fi

export PLAYWRIGHT_BROWSERS_PATH="${HOME}/.cache/ms-playwright"
npx playwright install-deps chromium
npx playwright install chromium
