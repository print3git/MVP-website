#!/usr/bin/env bash
set -euo pipefail

# 1) Verify token
TOKEN="${HF_TOKEN:-${HF_API_KEY:-}}"
if [[ -z "$TOKEN" ]]; then
  echo "✖️ HF_TOKEN or HF_API_KEY must be set" >&2
  exit 1
fi

# 2) Check write scope
if ! huggingface-cli whoami --token "$TOKEN" 2>/dev/null | grep -iq 'scope:.*write'; then
  echo "✖️ Token must have WRITE scope" >&2
  exit 1
fi

# 3) Define URLs (must end in .git)
SPACE_URL="${SPACE_URL:-https://huggingface.co/spaces/print2/Sparc3D.git}"
MODEL_URL="${MODEL_URL:-https://huggingface.co/print2/Sparc3D.git}"
[[ "$SPACE_URL" == *.git ]] || SPACE_URL="${SPACE_URL}.git"
[[ "$MODEL_URL" == *.git ]] || MODEL_URL="${MODEL_URL}.git"

# 4) Clean up and clone
rm -rf Sparc3D-Space
GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --filter=blob:none -- https://user:"$TOKEN"@${SPACE_URL#https://} Sparc3D-Space
cd Sparc3D-Space
git lfs install --skip-smudge --local

# 5) Configure remotes
git remote rename origin upstream 2>/dev/null || true
git remote add origin https://user:"$TOKEN"@${MODEL_URL#https://}

# 6) Push all branches and tags
git push --force origin --all
git push --force origin --tags

echo "✅ setup-space completed"
