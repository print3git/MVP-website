#!/usr/bin/env bash
set -euo pipefail
token="${HF_TOKEN:-${HF_API_KEY:-}}"
if [[ -z "$token" ]]; then
  echo "HF_TOKEN or HF_API_KEY must be set" >&2
  exit 1
fi
owner="print2"; repo="Sparc3D"
curl -X PATCH \
  -H "Authorization: Bearer $token" \
  -H "Content-Type: application/json" \
  https://huggingface.co/api/spaces/$owner/$repo \
  -d '{"sleep_after":0}' && \
  echo "✅ sleep_after set to 0"
