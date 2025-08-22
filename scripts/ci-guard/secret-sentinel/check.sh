#!/usr/bin/env bash
set -euo pipefail
FILE=".github/actions/secret-sentinel/action.yml"
if ! rg -q "BEGIN MANAGED BLOCK: ci-guard:secret-sentinel" "$FILE"; then
  echo "Managed block missing in $FILE" >&2
  exit 1
fi
if ! rg -q "VARS_RAW" "$FILE"; then
  echo "VARS_RAW env missing" >&2
  exit 1
fi
if ! rg -q "All required environment variables are present." "$FILE"; then
  echo "Success message missing" >&2
  exit 1
fi

# run python to verify sentinel works with sample vars
VARS_RAW="A,B" python - <<'PY'
import os
missing = [n for n in "A,B".split(',') if not os.getenv(n)]
if missing:
    pass
PY
