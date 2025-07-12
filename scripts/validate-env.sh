#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${STRIPE_TEST_KEY:-}" && -z "${STRIPE_LIVE_KEY:-}" ]]; then
  echo "Using dummy STRIPE_TEST_KEY" >&2
  export STRIPE_TEST_KEY="sk_test_dummy_$(date +%s)"
fi

if [[ -z "${HF_TOKEN:-${HF_API_KEY:-}}" ]]; then
  echo "HF_TOKEN or HF_API_KEY must be set" >&2
  exit 1
fi

echo "✅ environment OK"
