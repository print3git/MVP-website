#!/bin/bash
set -e
INSTALL_DIR="${INSTALL_DIR:-/tmp/gh-runner}"
if [ -f "$INSTALL_DIR/installed" ]; then
  echo "already installed"
  exit 0
fi
mkdir -p "$INSTALL_DIR"
touch "$INSTALL_DIR/installed"
echo "installed"
