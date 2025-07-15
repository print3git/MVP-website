#!/usr/bin/env bash
set -euo pipefail

if command -v mise >/dev/null 2>&1; then
  exit 0
fi

curl -fsSL https://mise.run | bash
# mise installer adds ~/.local/bin to PATH but it may not be active yet
export PATH="$HOME/.local/bin:$PATH"
echo "mise installed"
