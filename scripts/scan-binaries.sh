#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   scripts/scan-binaries.sh [--diff BASE..HEAD] [--allow 'regex1|regex2']
#
# Exits non-zero and prints a table if any binaries are found outside the allowlist.

ALLOW_RE='^$'  # default: allow nothing
DIFF_RANGE=''
while [[ $# -gt 0 ]]; do
  case "$1" in
    --diff) DIFF_RANGE="$2"; shift 2 ;;
    --allow) ALLOW_RE="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

# File set: either changes in a range, or all tracked files
if [[ -n "${DIFF_RANGE}" ]]; then
  mapfile -t CANDIDATES < <(git diff --name-only --diff-filter=AM "${DIFF_RANGE}")
else
  mapfile -t CANDIDATES < <(git ls-files)
fi

[[ ${#CANDIDATES[@]} -eq 0 ]] && { echo "No files to scan."; exit 0; }

# Known binary extensions
BINARY_EXT='
3ds|7z|aac|aif|aiff|apk|avi|bin|bmp|class|db|dcm|dylib|eot|exe|flac|gif|glb|gltf|gz|
ico|jar|jpeg|jpg|lockb|m4a|m4v|mid|mkv|mov|mp3|mp4|mpeg|mpg|o|obj|ogg|otf|pdf|png|
ppt|pptx|psd|rtf|so|sqlite|stl|tar|tif|tiff|ttf|wav|webm|webp|woff|woff2|xls|xlsx|zip
'
BINARY_EXT_REGEX="\.(?:$(echo "$BINARY_EXT" | tr -d ' \n'))$"

# Detect if a file is a Git LFS pointer (tiny text file, but represents a binary blob)
is_lfs_pointer() {
  head -n3 -- "$1" 2>/dev/null | grep -q '^version https://git-lfs.github.com/spec/v1'
}

printf '%-8s  %-12s  %s\n' "BINARY?" "REASON" "PATH"
printf '%0.s-' {1..80}; echo

FOUND=0
# For the final summaries
BINARIES_ALL=()
BINARIES_VIOLATIONS=()

for f in "${CANDIDATES[@]}"; do
  [[ ! -f "$f" ]] && continue

  IS_BINARY=0
  REASON=""

  # 1) Extension
  if [[ "$f" =~ $BINARY_EXT_REGEX ]]; then
    IS_BINARY=1
    REASON="ext"
  fi

  # 2) Content heuristic (NUL bytes)
  if [[ $IS_BINARY -eq 0 ]]; then
    # grep -IL exits 0 for *text* files. If it doesn't, we treat as binary.
    if ! grep -IL . -- "$f" >/dev/null 2>&1; then
      IS_BINARY=1
      REASON="${REASON:+$REASON,}nul"
    fi
  fi

  # 3) Git LFS pointer (represents a binary tracked via LFS)
  if [[ $IS_BINARY -eq 0 ]] && is_lfs_pointer "$f"; then
    IS_BINARY=1
    REASON="${REASON:+$REASON,}lfs"
  fi

  printf '%-8s  %-12s  %s\n' \
    "$([[ $IS_BINARY -eq 1 ]] && echo YES || echo no)" \
    "${REASON:--}" \
    "$f"

  if [[ $IS_BINARY -eq 1 ]]; then
    BINARIES_ALL+=( "$f" )
    if ! [[ "$f" =~ $ALLOW_RE ]]; then
      BINARIES_VIOLATIONS+=( "$f" )
      FOUND=$((FOUND+1))
    fi
  fi
done

echo
echo "=== True binary files (all detected) ==="
if [[ ${#BINARIES_ALL[@]} -eq 0 ]]; then
  echo "(none)"
else
  printf '%s\n' "${BINARIES_ALL[@]}"
fi

echo
echo "=== Binaries outside allowlist (will fail) ==="
if [[ ${#BINARIES_VIOLATIONS[@]} -eq 0 ]]; then
  echo "(none)"
else
  printf '%s\n' "${BINARIES_VIOLATIONS[@]}"
fi

if [[ $FOUND -gt 0 ]]; then
  echo
  echo "Found $FOUND binary file(s) outside the allowlist."
  echo "Add them to S3 (repo-assets/) and remove from git, or extend --allow with a safe path regex."
  exit 1
fi
