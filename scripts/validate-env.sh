#!/usr/bin/env bash
set -e
if [[ -z "${STRIPE_TEST_KEY:-}" && -z "${STRIPE_LIVE_KEY:-}" ]]; then
  echo "Using dummy STRIPE_TEST_KEY" >&2
  export STRIPE_TEST_KEY="sk_test_dummy_$(date +%s)"
fi
: "${HF_TOKEN:?HF_TOKEN must be set}"

if [[ -n "${npm_config_http_proxy:-}" || -n "${npm_config_https_proxy:-}" || -n "${http_proxy:-}" || -n "${https_proxy:-}" ]]; then
  echo "npm proxy variables must be unset" >&2
  exit 1
fi

echo "✅ environment OK"
