#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOKEN="$(node "$SCRIPT_DIR/gh-runner-token.js")"
if [[ -n "${GITHUB_ENV:-}" ]]; then
  echo "GH_RUNNER_REG_TOKEN=$TOKEN" >> "$GITHUB_ENV"
else
  export GH_RUNNER_REG_TOKEN="$TOKEN"
fi
