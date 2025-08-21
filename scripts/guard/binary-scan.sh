#!/usr/bin/env bash
set -euo pipefail

BASE=${1:-origin/main}

git fetch --depth=1 origin "${BASE#origin/}" >/dev/null 2>&1 || true

mapfile -t changed < <(git diff --name-only --diff-filter=AM "$BASE"...HEAD)
mapfile -t allowed < <(grep -v '^#' allowed-binaries.txt 2>/dev/null || true)

bad_files=()

for file in "${changed[@]}"; do
  [[ -f "$file" ]] || continue
  if printf '%s\n' "${allowed[@]}" | grep -Fxq "$file"; then
    continue
  fi
  magic=$(head -c 4 "$file" | od -An -t x1 | tr -d ' \n')
  case "$magic" in
    7f454c46*) bad_files+=("$file (ELF)");;
    feedface*|cefaedfe*|feedfacf*|cffaedfe*|cafebabe*|cafebabf*) bad_files+=("$file (Mach-O)");;
    4d5a*) bad_files+=("$file (PE)");;
    504b0304*|504b0506*|504b0708*)
      if [[ "$file" == *.jar ]]; then
        bad_files+=("$file (JAR)")
      else
        bad_files+=("$file (ZIP)")
      fi
      ;;
  esac
done

if [ ${#bad_files[@]} -ne 0 ]; then
  echo "Binary files detected in diff:" >&2
  printf ' - %s\n' "${bad_files[@]}" >&2
  exit 1
fi
