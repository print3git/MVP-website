#!/usr/bin/env bash
set -e
if [[ -z "${STRIPE_TEST_KEY:-}" && -z "${STRIPE_LIVE_KEY:-}" ]]; then
  echo "STRIPE_TEST_KEY or STRIPE_LIVE_KEY must be set" >&2
  exit 1
fi
: "${HF_TOKEN:?HF_TOKEN must be set}"

if [[ -n "${npm_config_http_proxy:-}" || -n "${npm_config_https_proxy:-}" || -n "${http_proxy:-}" || -n "${https_proxy:-}" ]]; then
  echo "npm proxy variables must be unset" >&2
  exit 1
fi

echo "✅ environment OK"