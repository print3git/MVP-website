#!/usr/bin/env bash
set -euo pipefail

# More verbose output for diagnostics
set -x

HF_TOKEN="${HF_TOKEN:-${HF_API_KEY:-}}"
if [[ -z "$HF_TOKEN" ]]; then
  echo "HF_TOKEN or HF_API_KEY must be set" >&2
  exit 1
fi

SPACE="${SPACE:-print2/Sparc3D}"
RETRIES=3

# Enable verbose Hugging Face hub output
export HF_HUB_VERBOSE=${HF_HUB_VERBOSE:-1}
export HF_TRANSFER_VERBOSE=${HF_TRANSFER_VERBOSE:-1}

# Capture rsync debug logs used under the hood by huggingface-cli
export RSYNC_RSH="ssh -vv"

# Check remote repo connectivity and rate limits
git ls-remote "https://huggingface.co/spaces/$SPACE.git" || true
curl -I "https://huggingface.co/api/spaces/$SPACE" || true

for i in $(seq 1 $RETRIES); do
  huggingface-cli --verbose sync "$SPACE" --repo-type space --verbose --stats && exit 0
  status=$?
  echo "Sync failed with exit code $status, retry $i..." >&2
  sleep $((i * 5))
done

exit 1
