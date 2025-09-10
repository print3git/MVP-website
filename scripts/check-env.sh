#!/usr/bin/env bash
set -e

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
    if [ -z "${!key+x}" ]; then
      export "$key"="$value"
    fi
  done < "$file"
}

is_placeholder() {
  local val="$1"
  local ending="$2"
  [[ -z "$val" || "$val" == "your_stripe_key_here" || "$val" == "$ending" || "$val" == *"$ending" ]]
}

if [ -f .env ]; then
  load_env_file .env
elif [ -f .env.example ]; then
  load_env_file .env.example
fi

# Provide safe mock defaults for external secrets
mock_id=$(date +%s)
for kv in \
  STRIPE_SECRET_KEY=sk_test_${mock_id}_mock \
  STRIPE_WEBHOOK_SECRET=whsec_${mock_id}_mock \
  AWS_ACCESS_KEY_ID=AKIA_MOCK \
  AWS_SECRET_ACCESS_KEY=aws_secret_mock \
  CF_PAGES_API_TOKEN=cf_mock \
  CLOUDFRONT_MODEL_DOMAIN=cdn.test; do
  key=${kv%%=*}
  val=${kv#*=}
  if [[ -z "${!key:-}" ]]; then
    export "$key"="$val"
  fi
done

if [[ -z "${HF_TOKEN:-}" && -z "${HF_API_KEY:-}" ]]; then
  echo "Using dummy HF_TOKEN and HF_API_KEY" >&2
  export HF_TOKEN="hf_dummy_$(date +%s)"
  export HF_API_KEY="$HF_TOKEN"
elif [[ -z "${HF_API_KEY:-}" ]]; then
  export HF_API_KEY="$HF_TOKEN"
fi

: "${DB_URL:?DB_URL must be set}"

if is_placeholder "$STRIPE_SECRET_KEY" "sk_test"; then
  echo "Using mock STRIPE_SECRET_KEY" >&2
fi
if is_placeholder "$STRIPE_WEBHOOK_SECRET" "whsec"; then
  echo "Using mock STRIPE_WEBHOOK_SECRET" >&2
fi
required_node_major="${REQUIRED_NODE_MAJOR:-20}"
current_major=$(node -v | sed -E "s/^v([0-9]+).*/\1/")
if [ "$current_major" -lt "$required_node_major" ]; then
  echo "Node $required_node_major or newer is required. Current version: $current_major" >&2
  exit 1
fi

# Fail fast if npm-specific proxy variables are set. Other proxy variables may be required
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

echo "✅ environment OK"
