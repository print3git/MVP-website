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

# Retry apt-get update to ensure the proxy is respected and networking is ready
for i in {1..3}; do
  if sudo -E apt-get update; then
    break
  else
    echo "apt-get update failed, retrying ($i/3)..." >&2
    sleep 5
  fi
done

npm ci
npm ci --prefix backend
if [ -f backend/hunyuan_server/package.json ]; then
  npm ci --prefix backend/hunyuan_server
fi

# Ensure dpkg is fully configured before Playwright installs dependencies
sudo dpkg --configure -a || true

CI=1 npx playwright install --with-deps
