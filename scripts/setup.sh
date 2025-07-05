#!/bin/bash
set -e
unset npm_config_http_proxy npm_config_https_proxy

# Persist proxy removal so new shells start clean
if ! grep -q "unset npm_config_http_proxy" ~/.bashrc 2>/dev/null; then
  echo "unset npm_config_http_proxy npm_config_https_proxy" >> ~/.bashrc
fi

# Abort early if the npm registry is unreachable
if ! npm ping >/dev/null 2>&1; then
  echo "Unable to reach the npm registry. Check network connectivity or proxy settings." >&2
  exit 1
fi

# Remove any existing node_modules directories to avoid ENOTEMPTY errors
sudo rm -rf node_modules backend/node_modules
if [ -d backend/hunyuan_server/node_modules ]; then
  sudo rm -rf backend/hunyuan_server/node_modules
fi

# Clear the npm cache to avoid cleanup warnings
npm cache clean --force

# Remove stale apt or dpkg locks that may prevent dependency installation
if pgrep apt-get >/dev/null 2>&1; then
  sudo pkill apt-get || true
fi
sudo rm -f /var/lib/apt/lists/lock /var/lib/dpkg/lock /var/cache/apt/archives/lock

if [ -z "$SKIP_PW_DEPS" ]; then
  # Retry apt-get update to ensure the proxy is respected and networking is ready
  for i in {1..3}; do
    if sudo -E apt-get update; then
      break
    else
      echo "apt-get update failed, retrying ($i/3)..." >&2
      sleep 5
    fi
  done
fi

npm ci
npm ci --prefix backend
if [ -f backend/hunyuan_server/package.json ]; then
  npm ci --prefix backend/hunyuan_server
fi

# Ensure dpkg is fully configured before Playwright installs dependencies
sudo dpkg --configure -a || true

if [ -z "$SKIP_PW_DEPS" ]; then
  CI=1 npx playwright install --with-deps
else
  CI=1 npx playwright install
fi
