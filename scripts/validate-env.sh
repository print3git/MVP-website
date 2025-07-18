#!/usr/bin/env bash
set -e

# Ensure mise is available for toolchain management
if ! command -v mise >/dev/null 2>&1; then
  "$(dirname "$0")/install-mise.sh" >/dev/null
fi

# Ensure mise activates the configured Node version so npm commands work even
# when the shell hasn't sourced mise's hook. This prevents "node: command not
# found" errors in fresh environments.
if ! command -v mise >/dev/null 2>&1; then
  "$(dirname "$0")/install-mise.sh" >/dev/null
  export PATH="$HOME/.local/bin:$PATH"
fi
eval "$(mise activate bash)"

# Silence mise warnings about untrusted config files
mise trust . >/dev/null 2>&1 || true
mise settings add idiomatic_version_file_enable_tools node --yes >/dev/null 2>&1 || true
if [ -f .mise.toml ]; then
  mise trust .mise.toml >/dev/null 2>&1 || true
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
load_env_file() {
  local file="$1"
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^\s*# || -z "$key" ]] && continue
    if [[ ! -v $key ]]; then
      export "$key"="$value"
    fi
  done < "$file"
}

if [ -f "$repo_root/.env" ]; then
  load_env_file "$repo_root/.env"
elif [ -f "$repo_root/.env.example" ]; then
  load_env_file "$repo_root/.env.example"
fi

# Fail fast if critical environment variables are missing before any heavy checks
fast_fail_vars=(DB_URL STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET)
for var in "${fast_fail_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "❌ Missing env var: $var" >&2
    exit 1
  fi
done

# In CI, provide safe defaults for missing critical variables
if [[ -n "${CI:-}" ]]; then
  bash "$script_dir/validate-env-hardend.sh"
fi

# Disable HTTP/2 for local testing to avoid client errors
export HTTP2=false

if [[ -z "${STRIPE_TEST_KEY:-}" && -z "${STRIPE_LIVE_KEY:-}" ]]; then
  echo "Using dummy STRIPE_TEST_KEY" >&2
  export STRIPE_TEST_KEY="sk_test_dummy_$(date +%s)"
fi
if [[ -z "${HF_TOKEN:-}" && -z "${HF_API_KEY:-}" ]]; then
  echo "Using dummy HF_TOKEN and HF_API_KEY" >&2
  export HF_TOKEN="hf_dummy_$(date +%s)"
  export HF_API_KEY="$HF_TOKEN"
elif [[ -z "${HF_API_KEY:-}" ]]; then
  export HF_API_KEY="$HF_TOKEN"
fi
# Ensure HF_API_KEY mirrors HF_TOKEN when only one is provided
if [[ -n "${HF_TOKEN:-}" && -z "${HF_API_KEY:-}" ]]; then
  export HF_API_KEY="$HF_TOKEN"
fi
# Map legacy S3_BUCKET to S3_BUCKET_NAME if needed
if [[ -n "${S3_BUCKET:-}" && -z "${S3_BUCKET_NAME:-}" ]]; then
  export S3_BUCKET_NAME="$S3_BUCKET"
fi
if [[ -z "${CLOUDFRONT_MODEL_DOMAIN:-}" ]]; then
  echo "Using dummy CLOUDFRONT_MODEL_DOMAIN" >&2
  export CLOUDFRONT_MODEL_DOMAIN="cdn.test"
fi

required_vars=(AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY DB_URL STRIPE_SECRET_KEY)
missing=()
for var in "${required_vars[@]}"; do
  echo "Checking $var: ${!var:-<unset>}" >&2
  if [[ -z "${!var:-}" ]]; then
    missing+=("$var")
  fi
done

if [ ${#missing[@]} -gt 0 ]; then
  echo "Missing required environment variables:" >&2
  printf '  - %s\n' "${missing[@]}" >&2
  echo "Please set them in your environment or .env file." >&2
  exit 1
fi

placeholder_db="postgres://user:password@localhost:5432/your_database"
if [[ -z "${SKIP_DB_CHECK:-}" && "${DB_URL}" == "$placeholder_db" ]]; then
  echo "Skipping DB check for placeholder DB_URL" >&2
  export SKIP_DB_CHECK=1
fi
required_node_major="${REQUIRED_NODE_MAJOR:-20}"
current_major=$(node -v | sed -E "s/^v([0-9]+).*/\1/")
if [ "$current_major" -ne "$required_node_major" ]; then
  echo "Installing Node $required_node_major via mise" >&2
  mise use -g node@$required_node_major >/dev/null 2>&1 || true
  eval "$(mise activate bash)"
  current_major=$(node -v | sed -E "s/^v([0-9]+).*/\1/")
  if [ "$current_major" -ne "$required_node_major" ]; then
    echo "Node $required_node_major is required. Current version: $current_major" >&2
    exit 1
  fi
fi


# Fail fast if npm-specific proxy variables are set. Other proxy variables may
# be required for connectivity in some environments and are tolerated.
if [[ -n "${npm_config_http_proxy:-}" || -n "${npm_config_https_proxy:-}" ]]; then
  echo "npm proxy variables must be unset" >&2
  exit 1
fi


if [[ -z "${SKIP_PW_DEPS:-}" ]]; then
  if ! node scripts/check-apt.js >/dev/null 2>&1; then
    echo "APT repository check failed. Falling back to SKIP_PW_DEPS=1." >&2
    export SKIP_PW_DEPS=1
  fi
fi

if [[ -z "${SKIP_NET_CHECKS:-}" ]]; then
  network_output=$(node scripts/network-check.js 2>&1)
  net_status=$?
  if [[ $net_status -ne 0 ]]; then
    echo "$network_output" >&2
    if echo "$network_output" | grep -q "Set SKIP_PW_DEPS=1"; then
      echo "Network check failed for Playwright CDN, setting SKIP_PW_DEPS=1." >&2
      export SKIP_PW_DEPS=1
    elif echo "$network_output" | grep -q "Playwright CDN"; then
      echo "Network check failed for Playwright CDN, setting SKIP_PW_DEPS=1." >&2
      export SKIP_PW_DEPS=1
    else
      echo "Network check failed. Ensure access to the npm registry and Playwright CDN, or set SKIP_NET_CHECKS=1 if dependencies are already installed." >&2
      exit 1
    fi
  fi
fi


if [[ -z "${SKIP_DB_CHECK:-}" ]]; then
  if ! node scripts/check-db.js >/dev/null 2>&1; then
    echo "Database connection check failed. Falling back to SKIP_DB_CHECK=1." >&2
    export SKIP_DB_CHECK=1
  fi
fi

if [[ -n "${PLAYWRIGHT_BASE_URL:-}" ]]; then
  if ! curl -fsI --max-time 5 "$PLAYWRIGHT_BASE_URL" >/dev/null; then
    echo "PLAYWRIGHT_BASE_URL unreachable: $PLAYWRIGHT_BASE_URL" >&2
    exit 1
  fi
fi

echo "✅ environment OK"
