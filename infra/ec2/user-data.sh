#!/usr/bin/env bash
set -euo pipefail

if [ "${PREWARM:-0}" = "1" ]; then
  "$(dirname "$0")/../tools/prewarm.sh"
fi
