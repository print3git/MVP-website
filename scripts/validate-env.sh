#!/usr/bin/env bash
set -e

if [[ -z "${STRIPE_TEST_KEY:-}" && -z "${STRIPE_LIVE_KEY:-}" ]]; then
  echo "STRIPE_TEST_KEY or STRIPE_LIVE_KEY must be set" >&2
  exit 1
fi

: "${HF_TOKEN:?HF_TOKEN must be set}"

if [[ -n "${STABILITY_KEY:-}" ]]; then
  : "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID must be set when STABILITY_KEY is set}"
  : "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY must be set when STABILITY_KEY is set}"
fi

echo "✅ environment OK"
