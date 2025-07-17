#!/usr/bin/env bash
set -euo pipefail

if ! command -v mise >/dev/null 2>&1; then
  curl -fsSL https://mise.run | bash
  # mise installer adds ~/.local/bin to PATH but it may not be active yet
  export PATH="$HOME/.local/bin:$PATH"
  echo "mise installed"
fi

# Ensure Node 20 is available globally so subsequent scripts work even if the
# container's default Node version differs.
mise use -g node@20 >/dev/null 2>&1 || true
