#!/bin/bash
set -e

# Ensure mise is available for toolchain management
"$(dirname "$0")/install-mise.sh" >/dev/null

cleanup_npm_cache() {
  npm cache clean --force >/dev/null 2>&1 || true
  for dir in "$(npm config get cache)/_cacache" "$HOME/.npm/_cacache"; do
    if [ -d "$dir" ]; then
      for i in {1..5}; do
        rm -rf "$dir" 2>/dev/null && break
        sleep 1
      done
    fi
  done
  rm -rf "$(npm config get cache)/_cacache/tmp" "$HOME/.npm/_cacache/tmp" 2>/dev/null || true
  npm cache verify >/dev/null 2>&1 || true
}

trap cleanup_npm_cache EXIT

handle_sigint() {
  echo "Setup interrupted by SIGINT. Please run 'npm run setup' again." >&2
  rm -f .setup-complete
  exit 130
}
trap handle_sigint SIGINT

cleanup_npm_cache

unset npm_config_http_proxy npm_config_https_proxy
export npm_config_fund=false

# Validate required environment variables and network access
bash "$(dirname "$0")/check-env.sh"

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

# Persist trust so new shells don't emit warnings
if ! grep -q "mise trust $(pwd)" ~/.bashrc 2>/dev/null; then
  echo "mise trust $(pwd) >/dev/null 2>&1 || true" >> ~/.bashrc
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
# Use rimraf@5 for reliability and fall back to rm. Retry up to 3 times in case
# the filesystem temporarily refuses to remove a directory.
remove_modules() {
  local target="$1"
  for i in {1..3}; do
    if sudo npx --yes rimraf@5 "$target" >/dev/null 2>&1; then
      break
    fi
    sudo rm -rf "$target" >/dev/null 2>&1 || true
    if [ ! -d "$target" ]; then
      break
    fi
    echo "retrying removal of $target ($i/3)" >&2
    sleep 1
  done
  if [ -d "$target" ]; then
    echo "warning: $target could not be fully removed" >&2
  fi
}

remove_modules node_modules
remove_modules backend/node_modules

# Remove stale apt or dpkg locks that may prevent dependency installation
if pgrep apt-get >/dev/null 2>&1; then
  sudo pkill apt-get || true
fi
sudo rm -f /var/lib/apt/lists/lock /var/lib/dpkg/lock /var/cache/apt/archives/lock

if [ -z "$SKIP_PW_DEPS" ]; then
  # Retry apt-get update to ensure the proxy is respected and networking is ready
  APT_OK=0
  for i in {1..3}; do
    if sudo -E apt-get update; then
      APT_OK=1
      break
    else
      echo "apt-get update failed, retrying ($i/3)..." >&2
      sleep 5
    fi
  done
  if [ "$APT_OK" -ne 1 ]; then
    echo "apt-get update failed after 3 attempts, skipping Playwright system dependencies" >&2
    export SKIP_PW_DEPS=1
  fi
fi

run_ci() {
  local dir="$1"
  local extra=""
  if [ -n "$dir" ]; then
    extra="--prefix $dir"
  fi
  local attempt=1
  local max_attempts=3
  while [ $attempt -le $max_attempts ]; do
    if npm ci $extra --no-audit --no-fund 2>ci.log; then
      rm -f ci.log
      return 0
    fi
    if grep -q "EUSAGE" ci.log; then
      echo "npm ci failed in $dir due to lock mismatch. Running npm install..." >&2
      npm install $extra --no-audit --no-fund
    elif grep -E -q "TAR_ENTRY_ERROR|ENOENT|ENOTEMPTY|tarball .*corrupted" ci.log; then
      echo "npm ci encountered tar or filesystem errors in $dir. Cleaning cache and retrying ($attempt/$max_attempts)..." >&2
      cleanup_npm_cache
      rm -rf ${dir:-.}/node_modules
    else
      cat ci.log >&2
      rm ci.log
      return 1
    fi
    attempt=$((attempt + 1))
  done
  npm ci $extra --no-audit --no-fund
  rm -f ci.log
}

run_ci ""
run_ci backend
run_ci backend/dalle_server

cleanup_npm_cache

# Ensure dpkg is fully configured before Playwright installs dependencies
sudo dpkg --configure -a || true

if [ -z "$SKIP_PW_DEPS" ]; then
  CI=1 npx playwright install --with-deps
else
  CI=1 npx playwright install
fi

# Verify Playwright host dependencies
node scripts/check-host-deps.js

touch .setup-complete
