#!/usr/bin/env bash
set -euo pipefail

CACHE_DIR="${HOME}/.npm"
PLAYWRIGHT_DIR="${HOME}/.cache/ms-playwright"
CACHE_OK=1
[[ -d "$CACHE_DIR" ]] || CACHE_OK=0

if node scripts/ci/detect-network.js >/dev/null 2>&1; then
  ONLINE=1
else
  ONLINE=0
fi

if [[ $ONLINE -eq 0 && $CACHE_OK -eq 0 ]]; then
  echo "❌ No network AND no npm cache. Cannot run offline. Ensure the 'deps' job ran and caches were restored."
  exit 1
fi

if [[ $ONLINE -eq 0 ]]; then
  export NPM_CONFIG_OFFLINE=true
fi

export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_DIR}"
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

echo "==> Format (backend)"
npm run format --prefix backend

echo "==> Test (backend)"
npm test --prefix backend
