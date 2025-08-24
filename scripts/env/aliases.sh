# shellcheck shell=bash
# Cloudflare env aliases
alias_pairs=(
  CF_ACCOUNT_ID:CLOUDFLARE_ACCOUNT_ID
  CF_PAGES_API_TOKEN:CLOUDFLARE_API_TOKEN
  CF_PAGES_PROJECT:CLOUDFLARE_PAGES_PROJECT
)
for pair in "${alias_pairs[@]}"; do
  IFS=: read -r primary secondary <<<"$pair"
  value="${!primary:-${!secondary-}}"
  if [ -n "$value" ]; then
    export "$primary"="$value"
    export "$secondary"="$value"
  fi
done
