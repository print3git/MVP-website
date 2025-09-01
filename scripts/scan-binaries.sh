#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   scripts/scan-binaries.sh [--diff BASE..HEAD] [--allow 'regex1|regex2']
#
# Exits non-zero and prints a table if any binaries are found outside the allowlist.
# At the end it prints two summaries:
#   - "True binary files (all detected):"     -> every detected binary in scope
#   - "Binaries outside allowlist (will fail)"-> binaries not matching --allow

ALLOW_RE='^$'  # default: allow nothing
DIFF_RANGE=''
while [[ $# -gt 0 ]]; do
  case "$1" in
    --diff)   DIFF_RANGE="$2"; shift 2 ;;
    --allow)  ALLOW_RE="$2";  shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

# File set
if [[ -n "${DIFF_RANGE}" ]]; then
  mapfile -t CANDIDATES < <(git diff --name-only --diff-filter=AM "${DIFF_RANGE}")
else
  mapfile -t CANDIDATES < <(git ls-files)
fi

[[ ${#CANDIDATES[@]} -eq 0 ]] && { echo "No files to scan."; exit 0; }

# Known-binary extensions (fast path)
BINARY_EXT='(glb|gltf|bin|png|jpe?g|webp|gif|tiff?|ico|pdf|zip|tar|gz|bz2|7z|mp4|mov|avi|mpe?g|webm|mp3|wav|ogg|flac|woff2?|ttf|otf)$'

# Consider these MIME types "text-like" for display-only (we do NOT flag by MIME)
TEXTY_MIME_RE='^(text/|application/(json|javascript|xml)|image/svg\+xml)'

# LFS-marked paths
declare -A LFS_PATHS=()
if [[ -s .gitattributes ]]; then
  while IFS= read -r p; do
    LFS_PATHS["$p"]=1
  done < <(
    printf '%s\n' "${CANDIDATES[@]}" | git check-attr -a --stdin \
      | awk '/: filter: lfs$/ {print $1}' | sed 's/:$//' | sort -u
  )
fi

printf '%-8s  %-12s %-40s  %s\n' "BINARY?" "REASON" "MIME" "PATH"
printf '%0.s-' {1..110}; echo

FOUND=0
TRUE_BIN=()      # all detected binaries (allowed or not)
VIOLATIONS=()    # binaries outside allowlist

for f in "${CANDIDATES[@]}"; do
  [[ ! -f "$f" ]] && continue

  REASON=""; MIME="unknown/unknown"; IS_BINARY=0

  # 1) Extension check
  if [[ "$f" =~ \.($BINARY_EXT) ]]; then
    IS_BINARY=1
    REASON="ext"
  fi

  # 2) NUL byte heuristic (grep -Iq returns nonzero on binary)
  if [[ $IS_BINARY -eq 0 ]]; then
    if ! grep -Iq . -- "$f"; then
      IS_BINARY=1
      REASON="${REASON:+$REASON,}nul"
    fi
  fi

  # 3) MIME (for display only)
  MIME="$(file -bi -- "$f" 2>/dev/null || echo "unknown/unknown")"
  # We do NOT flip IS_BINARY based solely on MIME; we only show it.

  # 4) LFS
  if [[ -n "${LFS_PATHS[$f]:-}" ]]; then
    IS_BINARY=1
    REASON="${REASON:+$REASON,}lfs"
  fi

  printf '%-8s  %-12s %-40s  %s\n' \
    "$([[ $IS_BINARY -eq 1 ]] && echo YES || echo no)" \
    "${REASON:--}" \
    "$MIME" \
    "$f"

  if [[ $IS_BINARY -eq 1 ]]; then
    TRUE_BIN+=("$f")
    if ! [[ "$f" =~ $ALLOW_RE ]]; then
      VIOLATIONS+=("$f")
      FOUND=$((FOUND+1))
    fi
  fi
done

echo
echo "True binary files (all detected):"
if (( ${#TRUE_BIN[@]} == 0 )); then
  echo "  (none)"
else
  printf '  %s\n' "${TRUE_BIN[@]}"
fi

echo
echo "Binaries outside allowlist (will fail):"
if (( ${#VIOLATIONS[@]} == 0 )); then
  echo "  (none)"
else
  printf '  %s\n' "${VIOLATIONS[@]}"
fi

if (( FOUND > 0 )); then
  echo
  echo "Found $FOUND binary file(s) outside the allowlist."
  echo "Add them to S3 (repo-assets/) and remove from git, or extend --allow with a safe path regex."
  exit 1
fi
