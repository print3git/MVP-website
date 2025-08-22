#!/usr/bin/env bash
set -euo pipefail

# Check for invalid shell declarations in diagnostics steps
if rg -n "shell: /usr/bin/bash -euo pipefail" .github/workflows >/tmp/diag-shell-fix.log; then
  echo "::error::Found invalid shell declarations:" >&2
  cat /tmp/diag-shell-fix.log >&2
  exit 1
fi
