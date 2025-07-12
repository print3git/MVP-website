#!/usr/bin/env bash
set -e
if [[ -z "${STRIPE_TEST_KEY:-}" && -z "${STRIPE_LIVE_KEY:-}" ]]; then
  echo "STRIPE_TEST_KEY or STRIPE_LIVE_KEY must be set" >&2
  exit 1
fi
: "${HF_TOKEN:?HF_TOKEN must be set}"


# Fail fast if any proxy variables are set. This includes both lowercase and
# uppercase variants because different shells export them differently.
if [[ -n "${npm_config_http_proxy:-}" || -n "${npm_config_https_proxy:-}" || \
      -n "${http_proxy:-}" || -n "${https_proxy:-}" || \
      -n "${HTTP_PROXY:-}" || -n "${HTTPS_PROXY:-}" ]]; then
  echo "npm proxy variables must be unset" >&2
  exit 1
fi

# Ensure basic network connectivity to external services used during setup.
for url in https://registry.npmjs.org https://cdn.playwright.dev; do
  if ! curl -I --connect-timeout 5 "$url" >/dev/null 2>&1; then
    echo "Unable to reach $url. Check network connectivity or proxy settings." >&2
    exit 1
  fi
done

echo "✅ environment OK"