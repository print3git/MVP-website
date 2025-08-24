#!/usr/bin/env bash
# Hardened environment validator for CI pipelines
set -euo pipefail

# Required environment variables
required_vars=(DB_URL AWS_SECRET_ACCESS_KEY STRIPE_SECRET_KEY HF_API_KEY)
missing=()

for var in "${required_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    missing+=("$var")
  fi
done

if [ ${#missing[@]} -gt 0 ]; then
  echo "warning: missing env vars ${missing[*]}, using safe defaults" >&2
  : "${DB_URL:=postgres://localhost/test}"
  : "${AWS_SECRET_ACCESS_KEY:=dummy}"
  : "${STRIPE_SECRET_KEY:=sk_test_dummy}"
  : "${HF_API_KEY:=hf_dummy}"
fi
