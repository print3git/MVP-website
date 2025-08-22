#!/usr/bin/env bash
set -euo pipefail
mkdir -p ci-guard/pnpm-monorepo-install
roots=()
[ -f package.json ] && roots+=(".")
[ -f frontend/package.json ] && roots+=("frontend")
[ -f backend/package.json ] && roots+=("backend")
[ -f apps/web/package.json ] && roots+=("apps/web")
[ -f apps/api/package.json ] && roots+=("apps/api")
if [ ${#roots[@]} -eq 0 ]; then
  echo "::error::No package.json found in known locations" >&2
  exit 2
fi
printf '%s\n' "${roots[@]}" > ci-guard/pnpm-monorepo-install/roots.txt
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "count=${#roots[@]}" >> "$GITHUB_OUTPUT"
fi
while read d; do
  echo "Installing in $d"
  (cd "$d" && pnpm install --frozen-lockfile)
done < ci-guard/pnpm-monorepo-install/roots.txt
