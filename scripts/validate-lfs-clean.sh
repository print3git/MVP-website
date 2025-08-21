#!/usr/bin/env bash
set -euo pipefail
if grep -E '^\s*img/.*filter=lfs' .gitattributes >/dev/null; then
  echo "img/ paths are LFS-tracked in .gitattributes"
  exit 1
fi
if git lfs track | grep -q 'img/'; then
  echo "git lfs track lists img/"
  exit 1
fi
