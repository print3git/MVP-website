#!/bin/bash
set -e

cleanup_npm_cache() {
  npm cache clean --force >/dev/null 2>&1 || true
  rm -rf "$(npm config get cache)/_cacache" "$HOME/.npm/_cacache"
  rm -rf "$(npm config get cache)/_cacache/tmp" "$HOME/.npm/_cacache/tmp"
}

trap cleanup_npm_cache EXIT
cleanup_npm_cache

unset npm_config_http_proxy npm_config_https_proxy
export npm_config_fund=false


if [ -z "$STRIPE_TEST_KEY" ]; then
  export STRIPE_TEST_KEY="sk_test_dummy_$(date +%s)"
fi

if [[ -z "$STRIPE_TEST_KEY" && -z "$STRIPE_LIVE_KEY" ]]; then
  echo "Using dummy STRIPE_TEST_KEY" >&2
  export STRIPE_TEST_KEY="sk_test_dummy_$(date +%s)"
fi

# Persist proxy removal so new shells start clean
if ! grep -q "unset npm_config_http_proxy" ~/.bashrc 2>/dev/null; then
  echo "unset npm_config_http_proxy npm_config_https_proxy" >> ~/.bashrc
fi

# Silence mise warnings about idiomatic version files
mise trust . >/dev/null 2>&1 || true
mise settings add idiomatic_version_file_enable_tools node --yes >/dev/null 2>&1 || true
if [ -f .mise.toml ]; then
  mise trust .mise.toml >/dev/null 2>&1 || true
fi

# Persist the setting so new shells don't emit warnings
if ! grep -q "idiomatic_version_file_enable_tools" ~/.bashrc 2>/dev/null; then
  echo "mise settings add idiomatic_version_file_enable_tools node >/dev/null 2>&1 || true" >> ~/.bashrc
fi

# Abort early if the npm registry is unreachable
if ! npm ping >/dev/null 2>&1; then
  echo "Unable to reach the npm registry. Check network connectivity or proxy settings." >&2
  exit 1
fi

# Kill any lingering dev server processes to avoid port conflicts
if pgrep -f "node scripts/dev-server.js" >/dev/null 2>&1; then
  pkill -f "node scripts/dev-server.js" || true
fi

# Remove any existing node_modules directories to avoid ENOTEMPTY errors
sudo rm -rf node_modules backend/node_modules

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

npm ci --no-audit --no-fund
npm ci --prefix backend --no-audit --no-fund

cleanup_npm_cache

# Ensure dpkg is fully configured before Playwright installs dependencies
sudo dpkg --configure -a || true

if [ -z "$SKIP_PW_DEPS" ]; then
  CI=1 npx playwright install --with-deps
else
  CI=1 npx playwright install
fi
touch .setup-complete
