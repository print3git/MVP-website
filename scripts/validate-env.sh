#!/usr/bin/env bash
set -e

# Ensure mise activates the configured Node version so npm commands work even
# when the shell hasn't sourced mise's hook. This prevents "node: command not
# found" errors in fresh environments.
eval "$(mise activate bash)"

# Silence mise warnings about untrusted config files
mise trust . >/dev/null 2>&1 || true
mise settings add idiomatic_version_file_enable_tools node --yes >/dev/null 2>&1 || true
if [ -f .mise.toml ]; then
  mise trust .mise.toml >/dev/null 2>&1 || true
fi
load_env_file() {
  local file="$1"
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^\s*# || -z "$key" ]] && continue
    if [ -z "${!key:-}" ]; then
      export "$key"="$value"
    fi
  done < "$file"
}

if [ -f .env ]; then
  load_env_file .env
elif [ -f .env.example ]; then
  load_env_file .env.example
fi

if [[ -z "${STRIPE_TEST_KEY:-}" && -z "${STRIPE_LIVE_KEY:-}" ]]; then
  echo "Using dummy STRIPE_TEST_KEY" >&2
  export STRIPE_TEST_KEY="sk_test_dummy_$(date +%s)"
fi
if [[ -z "${HF_TOKEN:-}" && -z "${HF_API_KEY:-}" ]]; then
  echo "Using dummy HF_TOKEN" >&2
  export HF_TOKEN="hf_dummy_$(date +%s)"
fi
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID must be set}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY must be set}"
: "${DB_URL:?DB_URL must be set}"
: "${STRIPE_SECRET_KEY:?STRIPE_SECRET_KEY must be set}"


# Fail fast if npm-specific proxy variables are set. Other proxy variables may
# be required for connectivity in some environments and are tolerated.
if [[ -n "${npm_config_http_proxy:-}" || -n "${npm_config_https_proxy:-}" ]]; then
  echo "npm proxy variables must be unset" >&2
  exit 1
fi


if [[ -z "${SKIP_NET_CHECKS:-}" ]]; then
  if ! node scripts/network-check.js >/dev/null 2>&1; then
    echo "Network check failed. Ensure access to the npm registry and Playwright CDN." >&2
    exit 1
  fi
fi

if [[ -z "${SKIP_PW_DEPS:-}" ]]; then
  if ! node scripts/check-apt.js >/dev/null 2>&1; then
    echo "APT repository check failed. Falling back to SKIP_PW_DEPS=1." >&2
    export SKIP_PW_DEPS=1
  fi
fi

if [[ -z "${SKIP_DB_CHECK:-}" ]]; then
  if ! node scripts/check-db.js >/dev/null 2>&1; then
    echo "Database connection check failed. Set SKIP_DB_CHECK=1 to skip." >&2
    exit 1
  fi
fi

echo "✅ environment OK"
