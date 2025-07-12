#!/usr/bin/env bash
set -e
if [[ -z "${STRIPE_TEST_KEY:-}" && -z "${STRIPE_LIVE_KEY:-}" ]]; then
  echo "STRIPE_TEST_KEY or STRIPE_LIVE_KEY must be set" >&2
  exit 1
fi

# Provide a fallback token so local setup doesn't fail when HF_TOKEN is unset
if [[ -z "${HF_TOKEN:-}" ]]; then
  export HF_TOKEN="hf_dummy_$(date +%s)"
fi

if [[ -n "${npm_config_http_proxy:-}" || -n "${npm_config_https_proxy:-}" || -n "${http_proxy:-}" || -n "${https_proxy:-}" ]]; then
  echo "npm proxy variables must be unset" >&2
  exit 1
fi

echo "✅ environment OK"
