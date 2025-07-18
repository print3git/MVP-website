#!/usr/bin/env bash
set -euo pipefail

# Custom setup script with verified mise installation

MISE_VERSION="v2025.7.12"
ARCH="linux-x64"
INSTALL_URL="https://github.com/jdx/mise/releases/download/${MISE_VERSION}/mise-${MISE_VERSION}-${ARCH}"
CHECKSUM_URL="https://github.com/jdx/mise/releases/download/${MISE_VERSION}/SHASUMS256.txt"

if ! command -v mise >/dev/null 2>&1; then
  echo "curl -L ${INSTALL_URL} -o /tmp/mise" >&2
  curl -L "${INSTALL_URL}" -o /tmp/mise
  echo "curl -L ${CHECKSUM_URL} -o /tmp/mise.sha256" >&2
  curl -L "${CHECKSUM_URL}" -o /tmp/mise.sha256
  grep "mise-${MISE_VERSION}-${ARCH}$" /tmp/mise.sha256 | sha256sum -c -
  install -Dm755 /tmp/mise "$HOME/.local/bin/mise"
  rm /tmp/mise /tmp/mise.sha256
  export PATH="$HOME/.local/bin:$PATH"
  echo "mise installed"
fi

# Activate Node 20 globally
mise use -g node@20 >/dev/null 2>&1 || true

# delegate to existing setup script logic
bash "$(dirname "$0")/setup.sh"
