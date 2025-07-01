#!/bin/bash
set -e
unset npm_config_http_proxy npm_config_https_proxy
npm ci
npm ci --prefix backend
if [ -f backend/hunyuan_server/package.json ]; then
  npm ci --prefix backend/hunyuan_server
fi
# Ensure dpkg is fully configured before Playwright installs dependencies
dpkg --configure -a || true
CI=1 npx playwright install --with-deps
