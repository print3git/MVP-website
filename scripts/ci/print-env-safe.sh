#!/usr/bin/env bash
set -euo pipefail

shopt -s nocasematch

echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"
echo "git commit: $(git rev-parse --short HEAD)"

env | sort | while IFS='=' read -r name value; do
  if [[ "$name" =~ (KEY|TOKEN|SECRET) ]]; then
    echo "$name=***"
  else
    echo "$name=$value"
  fi
done

shopt -u nocasematch
