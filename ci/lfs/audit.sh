#!/usr/bin/env bash
set -euo pipefail

# Determine merge base against main or provided base ref
base_ref="${GITHUB_BASE_REF:-main}"
merge_base=$(git merge-base HEAD "origin/${base_ref}" 2>/dev/null || git merge-base HEAD "${base_ref}" 2>/dev/null || echo "")

if [[ -n "$merge_base" ]]; then
  range="$merge_base..HEAD"
else
  range="HEAD"
fi

declare -a non_pointer=()

# Iterate over changed files in the range
while IFS= read -r -d '' file; do
  [[ -f "$file" ]] || continue
  if git check-attr filter -- "$file" | grep -q 'filter: lfs'; then
    blob=$(git ls-tree HEAD -- "$file" | awk '{print $3}')
    if ! git cat-file -p "$blob" | head -n 1 | grep -q "version https://git-lfs.github.com/spec/v1"; then
      non_pointer+=("$file")
    fi
  fi
done < <(git diff --name-only -z "$range")

if (( ${#non_pointer[@]} )); then
  echo "The following files are not stored via Git LFS:"
  printf ' - %s\n' "${non_pointer[@]}"
  echo
  echo "To fix, run:"
  for f in "${non_pointer[@]}"; do
    printf 'git lfs migrate import --include=%q\n' "$f"
  done
  exit 1
fi
