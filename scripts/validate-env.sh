#!/usr/bin/env bash
set -e

if [[ -z "${STRIPE_TEST_KEY}" ]]; then
  echo "Error: STRIPE_TEST_KEY is not set"
  exit 1
fi

echo "Environment validation passed ✅"
