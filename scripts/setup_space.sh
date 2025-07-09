#!/usr/bin/env bash
set -euo pipefail

# Verify HuggingFace token and write scope
TOKEN="${HF_TOKEN:-${HF_API_KEY:-}}"
if [[ -z "$TOKEN" ]]; then
  echo "\u274c HF_TOKEN or HF_API_KEY must be set" >&2
  exit 1
fi
SCOPES=$(huggingface-cli whoami --token "$TOKEN" 2>/dev/null | grep -i scopes || true)
if ! echo "$SCOPES" | grep -q write; then
  echo "\u274c token lacks write scope" >&2
  exit 1
fi

SPACE_REPO="print2/Sparc3D"
SPACE_URL="https://huggingface.co/spaces/${SPACE_REPO}.git"

# Create the Space if missing
if ! huggingface-cli repo info "$SPACE_REPO" --repo-type space >/dev/null 2>&1; then
  huggingface-cli repo create "$SPACE_REPO" --repo-type space --private --space-sdk gradio -y
fi

# Remove old clone
rm -rf Sparc3D-Space

# Clone with blob filtering and skip LFS smudge
GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --filter=blob:none "https://user:$TOKEN@${SPACE_URL#https://}" Sparc3D-Space
cd Sparc3D-Space
git lfs install --skip-smudge --local
cd ..

# Rsync files
rsync -a app.py README.md src/ scripts/ Sparc3D-Space/

cd Sparc3D-Space

# Rename remotes and push
git remote rename origin upstream 2>/dev/null || true
git remote add origin "https://user:$TOKEN@${SPACE_URL#https://}"

git add .
if ! git diff --cached --quiet; then
  git commit -m "Sync $(date -Iseconds)"
fi

git push origin HEAD:main --tags

# Green success banner
printf '\e[32m%s\e[0m\n' 'Space setup completed successfully'
