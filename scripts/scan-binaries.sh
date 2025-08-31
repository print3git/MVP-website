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

# File sets
if [[ -n "${DIFF_RANGE}" ]]; then
  mapfile -t CANDIDATES < <(git diff --name-only --diff-filter=AM "${DIFF_RANGE}")
else
  mapfile -t CANDIDATES < <(git ls-files)
fi

# If repo is empty / no changes
[[ ${#CANDIDATES[@]} -eq 0 ]] && { echo "No files to scan."; exit 0; }

# Known-binary extensions (fallback)
BINARY_EXT='(glb|gltf|bin|png|jpe?g|webp|gif|tiff?|ico|pdf|zip|tar|gz|bz2|7z|mp4|mov|avi|mpe?g|webm|mp3|wav|ogg|flac|woff2?|ttf|otf)$'

# Consider these MIME types "text-like" even if they look odd (e.g., UTF-16)
TEXTY_MIME_RE='^(text/|application/(json|javascript|xml)|image/svg\+xml)'

# Build an LFS map: any path with filter:lfs is treated as binary
declare -A LFS_PATHS=()
if [[ -s .gitattributes ]]; then
  # git check-attr prints "path: filter: lfs" – we collect those paths
  # This is best-effort for changed files; whole-tree is fine too.
  while IFS= read -r p; do
    LFS_PATHS["$p"]=1
  done < <(
    printf '%s\n' "${CANDIDATES[@]}" | git check-attr -a --stdin \
      | awk '/: filter: lfs$/ {print $1}' | sed 's/:$//' | sort -u
  )
fi

printf '%-8s  %-8s  %-40s  %s\n' "BINARY?" "REASON" "MIME" "PATH"
printf '%0.s-' {1..100}; echo

FOUND=0

for f in "${CANDIDATES[@]}"; do
  [[ ! -f "$f" ]] && continue  # skip deleted or directories

  REASON=""; MIME=""; IS_BINARY=0

  # 1) Extension check (fast)
  if [[ "$f" =~ \.($BINARY_EXT) ]]; then
    IS_BINARY=1
    REASON="ext"
  fi

  # 2) Heuristic text check (NUL bytes): grep -Iq returns non-zero if binary
  if [[ $IS_BINARY -eq 0 ]]; then
    if ! grep -Iq . -- "$f"; then
      IS_BINARY=1
      REASON="${REASON:+$REASON,}nul"
    fi
  fi

  # 3) MIME sniff
  MIME="$(file -bi -- "$f" 2>/dev/null || echo "unknown/unknown")"
  if [[ $IS_BINARY -eq 0 ]]; then
    if ! [[ "$MIME" =~ $TEXTY_MIME_RE ]]; then
      # Many binaries will fall here (image/*, model/*, application/octet-stream, etc.)
      IS_BINARY=1
      REASON="${REASON:+$REASON,}mime"
    fi
  fi

  # 4) LFS-marked?
  if [[ -n "${LFS_PATHS[$f]:-}" ]]; then
    IS_BINARY=1
    REASON="${REASON:+$REASON,}lfs"
  fi

  # Print row
  printf '%-8s  %-8s  %-40s  %s\n' \
    "$([[ $IS_BINARY -eq 1 ]] && echo YES || echo no)" \
    "${REASON:--}" \
    "$MIME" \
    "$f"

  # Fail if binary and not allowed
  if [[ $IS_BINARY -eq 1 ]]; then
    if ! [[ "$f" =~ $ALLOW_RE ]]; then
      FOUND=$((FOUND+1))
    fi
  fi
done

if [[ $FOUND -gt 0 ]]; then
  echo
  echo "Found $FOUND binary file(s) outside the allowlist."
  echo "Add them to S3 (repo-assets/) and remove from git, or extend --allow with a safe path regex."
  exit 1
fi
