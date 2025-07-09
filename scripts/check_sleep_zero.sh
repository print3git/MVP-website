#!/usr/bin/env bash
set -euo pipefail
SPACE_REPO="${SPACE_REPO:-print2/Sparc3D}"
API_URL="https://huggingface.co/api/spaces/$SPACE_REPO"
current=$(curl -sf "$API_URL" | jq -r '.sleep_after')
if [[ "$current" == "0" ]]; then
  echo "sleep_after already 0"
  exit 0
fi
if [[ -n "${HF_TOKEN:-${HF_API_KEY:-}}" ]]; then
  token="${HF_TOKEN:-${HF_API_KEY:-}}"
  curl -sf -X PATCH -H "Authorization: Bearer $token" -H "Content-Type: application/json" "$API_URL" -d '{"sleep_after":0}' >/dev/null || true
fi
new_val=$(curl -sf "$API_URL" | jq -r '.sleep_after')
msg="sleep_after was $current, now $new_val on $SPACE_REPO"
if [[ "$new_val" != "0" ]]; then
  [[ -n "${SLACK_WEBHOOK:-}" ]] && curl -s -X POST -H "Content-Type: application/json" --data "{\"text\":\"$msg\"}" "$SLACK_WEBHOOK"
  echo "$msg" >&2
  exit 1
fi
[[ -n "${SLACK_WEBHOOK:-}" ]] && curl -s -X POST -H "Content-Type: application/json" --data "{\"text\":\"$msg\"}" "$SLACK_WEBHOOK"
echo "$msg"
