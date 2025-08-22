#!/usr/bin/env bash
set -euo pipefail
git lfs install
git lfs migrate import --include="img/.png,img/.jpg" --no-rewrite || true
git add .gitattributes || true
echo "If binaries are already committed as regular files, run:"
echo " git lfs migrate import --include='img/.png,img/.jpg'"
