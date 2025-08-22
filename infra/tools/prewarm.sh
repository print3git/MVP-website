#!/usr/bin/env bash
set -euo pipefail

# Simple timer helper
declare -a STEPS
declare -a TIMES

time_step() {
  local name="$1"
  shift
  local start=$(date +%s)
  "$@" >/dev/null 2>&1
  local end=$(date +%s)
  STEPS+=("$name")
  TIMES+=($((end-start)))
}

# Ensure npm cache
npm_cache=$(npm config get cache 2>/dev/null || echo "$HOME/.npm")
time_step "npm cache" mkdir -p "$npm_cache"

# Ensure pnpm store
pnpm_store=$(pnpm store path 2>/dev/null || echo "$HOME/.pnpm-store")
time_step "pnpm store" mkdir -p "$pnpm_store"

# Common cache dirs
time_step "common caches" mkdir -p "$HOME/.cache" "$HOME/.cache/pnpm" "$HOME/.cache/npm" "$HOME/.cache/ms-playwright"

# Pre-install Playwright browsers
if [ "${INSTALL_PLAYWRIGHT_DEPS:-0}" = "1" ]; then
  time_step "playwright" npx -y playwright install --with-deps
else
  time_step "playwright" npx -y playwright install
fi

# Print summary
printf 'Timing summary\n'
for i in "${!STEPS[@]}"; do
  printf '%-16s %ss\n' "${STEPS[$i]}" "${TIMES[$i]}"
  total=$((total + TIMES[$i]))
done
printf '%-16s %ss\n' total "$total"
