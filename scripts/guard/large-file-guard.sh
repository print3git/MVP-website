#!/usr/bin/env bash
set -euo pipefail

BASE_REF=${GITHUB_BASE_REF:-main}
THRESHOLD=$((5 * 1024 * 1024))

git fetch origin "$BASE_REF" >/dev/null 2>&1 || true

mapfile -t files < <(git diff --numstat "origin/${BASE_REF}"... | cut -f3-)

offenders=()
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    size=$(stat -c%s "$file")
    if [ "$size" -gt "$THRESHOLD" ]; then
      offenders+=("$file")
    fi
  fi
done

if [ ${#offenders[@]} -gt 0 ]; then
  echo "Error: the following files exceed 5MB:" >&2
  printf '%s\n' "${offenders[@]}" >&2
  exit 1
fi

echo "No files exceed 5MB." 
