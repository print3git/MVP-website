#!/usr/bin/env bash
set -e
: "${STRIPE_TEST_KEY:-${STRIPE_LIVE_KEY}}" || {
  echo "STRIPE_TEST_KEY or STRIPE_LIVE_KEY must be set" >&2
  exit 1
}
: "${HF_TOKEN:?HF_TOKEN must be set}"
echo "✅ environment OK"
