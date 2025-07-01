#!/bin/bash
set -e
unset npm_config_http_proxy npm_config_https_proxy

# Remove stale apt or dpkg locks that may prevent dependency installation
if pgrep apt-get >/dev/null 2>&1; then
  sudo pkill apt-get || true
fi
sudo rm -f /var/lib/apt/lists/lock /var/lib/dpkg/lock /var/cache/apt/archives/lock

npm ci
npm ci --prefix backend
if [ -f backend/hunyuan_server/package.json ]; then
  npm ci --prefix backend/hunyuan_server
fi

# Ensure dpkg is fully configured before Playwright installs dependencies
sudo dpkg --configure -a || true

PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright
mkdir -p "$PLAYWRIGHT_BROWSERS_PATH"
CI=1 PLAYWRIGHT_BROWSERS_PATH="$PLAYWRIGHT_BROWSERS_PATH" npx playwright install --with-deps
