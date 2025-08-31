#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   scripts/scan-binaries.sh [--diff BASE..HEAD] [--allow 'regex1|regex2']
#
# Prints a per-file table, plus two compact lists at the end:
#  - "True binary files (all detected)"
#  - "Binaries outside allowlist (will fail)"
#
# Exit code: non-zero if any binaries are outside the allowlist.

ALLOW_RE='^$'  # default: allow nothing
DIFF_RANGE=''

while [[ $# -gt 0 ]]; do
  case "$1" in
    --diff) DIFF_RANGE="$2"; shift 2 ;;
    --allow) ALLOW_RE="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

# Candidate files: diff range or entire index
if [[ -n "${DIFF_RANGE}" ]]; then
  mapfile -t CANDIDATES < <(git diff --name-only --diff-filter=AM "${DIFF_RANGE}")
else
  mapfile -t CANDIDATES < <(git ls-files)
fi

[[ ${#CANDIDATES[@]} -eq 0 ]] && { echo "No files to scan."; exit 0; }

# Known-binary extensions (broad but safe)
BINARY_EXT='
3ds|7z|aac|aif|aiff|apk|avi|bin|bmp|class|db|dcm|dylib|eot|exe|flac|gif|glb|gltf|gz|
ico|jar|jpeg|jpg|lockb|m4a|m4v|mid|mkv|mov|mp3|mp4|mpeg|mpg|o|obj|ogg|otf|pdf|png|
ppt|pptx|psd|rtf|so|sqlite|stl|tar|tif|tiff|ttf|wav|webm|webp|woff|woff2|xls|xlsx|zip
'
BINARY_EXT_REGEX="\.(?:$(echo "$BINARY_EXT" | tr -d ' \n'))$"

# LFS pointer check: tiny text file that represents a binary blob
is_lfs_pointer() {
  head -n3 -- "$1" 2>/dev/null | grep -q '^version https://git-lfs.github.com/spec/v1'
}

# Best-effort MIME (for display only; NOT a deciding factor)
mime_of() {
  file -bi -- "$1" 2>/dev/null || echo "unknown/unknown"
}

printf '%-8s  %-12s  %-24s  %s\n' "BINARY?" "REASON" "MIME" "PATH"
printf '%0.s-' {1..120}; echo

FOUND=0
BINARIES_ALL=()
BINARIES_VIOLATIONS=()

for f in "${CANDIDATES[@]}"; do
  [[ ! -f "$f" ]] && continue

  IS_BINARY=0
  REASON=""
  MIME="$(mime_of "$f")"

  # 1) Extension
  if [[ "$f" =~ $BINARY_EXT_REGEX ]]; then
    IS_BINARY=1
    REASON="ext"
  fi

  # 2) NUL-byte / binary heuristic (locale-agnostic)
  if [[ $IS_BINARY -eq 0 ]]; then
    if ! LC_ALL=C grep -qI . -- "$f"; then
      IS_BINARY=1
      REASON="${REASON:+$REASON,}nul"
    fi
  fi

  # 3) Git LFS pointer text file
  if [[ $IS_BINARY -eq 0 ]] && is_lfs_pointer "$f"; then
    IS_BINARY=1
    REASON="${REASON:+$REASON,}lfs"
  fi

  printf '%-8s  %-12s  %-24s  %s\n' \
    "$([[ $IS_BINARY -eq 1 ]] && echo YES || echo no)" \
    "${REASON:--}" \
    "$MIME" \
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
