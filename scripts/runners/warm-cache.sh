#!/usr/bin/env bash
set -euo pipefail

# Create expected cache directories for CI runners
mkdir -p "$HOME/.cache/pip"
mkdir -p "$HOME/.cache/go-build"
mkdir -p "$HOME/.cargo"
mkdir -p .turbo

# Show disk usage of the caches
du -sh "$HOME/.cache/pip" "$HOME/.cache/go-build" "$HOME/.cargo" .turbo
