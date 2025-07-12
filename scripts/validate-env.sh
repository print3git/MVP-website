#!/usr/bin/env bash
set -e
if [[ -z "${STRIPE_TEST_KEY:-}" && -z "${STRIPE_LIVE_KEY:-}" ]]; then
  echo "Using dummy STRIPE_TEST_KEY" >&2
  export STRIPE_TEST_KEY="sk_test_dummy_$(date +%s)"
fi
: "${HF_TOKEN:?HF_TOKEN must be set}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID must be set}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY must be set}"


# Fail fast if npm-specific proxy variables are set. Other proxy variables may
# be required for connectivity in some environments and are tolerated.
if [[ -n "${npm_config_http_proxy:-}" || -n "${npm_config_https_proxy:-}" ]]; then
  echo "npm proxy variables must be unset" >&2
  exit 1
fi


if [[ -z "${SKIP_NET_CHECKS:-}" ]]; then
  if ! npm ping >/dev/null 2>&1; then
    echo "Unable to reach the npm registry. Check network connectivity or proxy settings." >&2
    exit 1
  fi
  if ! curl -sfI https://cdn.playwright.dev >/dev/null; then
    echo "Unable to reach https://cdn.playwright.dev" >&2
    exit 1
  fi
fi

echo "✅ environment OK"
