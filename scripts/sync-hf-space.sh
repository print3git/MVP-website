#!/usr/bin/env bash
set -euo pipefail

HF_TOKEN="${HF_TOKEN:-${HF_API_KEY:-}}"
if [[ -z "$HF_TOKEN" ]]; then
  echo "HF_TOKEN or HF_API_KEY must be set" >&2
  exit 1
fi

SPACE="${SPACE:-print2/Sparc3D}"
RETRIES=3
for i in $(seq 1 $RETRIES); do
  huggingface-cli sync "$SPACE" && exit 0
  echo "Sync failed, retry #$i..." >&2
  sleep $((i * 2))
done

exit 1
