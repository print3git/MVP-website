#!/usr/bin/env bash
set -e
: "${STRIPE_TEST_KEY:?STRIPE_TEST_KEY must be set}"
: "${HF_TOKEN:?HF_TOKEN must be set}"
echo "✅ environment OK"