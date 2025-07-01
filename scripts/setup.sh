#!/bin/bash
set -e
unset npm_config_http_proxy npm_config_https_proxy

# Remove any existing node_modules directories to avoid ENOTEMPTY errors
rm -rf node_modules backend/node_modules
if [ -d backend/hunyuan_server/node_modules ]; then
  rm -rf backend/hunyuan_server/node_modules
fi

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

CI=1 npx playwright install --with-deps
