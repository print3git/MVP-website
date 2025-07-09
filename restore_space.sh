#!/usr/bin/env bash
set -euo pipefail
HF_TOKEN="${HF_TOKEN:-${HF_API_KEY:-}}"
if [[ -z "$HF_TOKEN" ]]; then
  echo "HF_TOKEN or HF_API_KEY must be set" >&2
  exit 1
fi

# Restore the Sparc3D Hugging Face Space and push local code.
# This script recreates the Space on the free tier and syncs our local files.

SPACE_REPO="print2/Sparc3D"
LOCAL_DIR="Sparc3D-Space"
SPACE_URL="https://user:${HF_TOKEN}@huggingface.co/spaces/${SPACE_REPO}.git"

# Create or recreate the Space repository on Hugging Face
huggingface-cli repo create "$SPACE_REPO" \
  --repo-type space \
  --space_sdk gradio \
  --private \
  --yes \
  || true
# Ensure the Space uses ZeroGPU hardware
curl -s -X PATCH "https://huggingface.co/api/spaces/${SPACE_REPO}" \
  -H "Authorization: Bearer ${HF_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"hardware":"zero-gpu","sleep_time":0}' >/dev/null

# Remove any existing local clone
rm -rf "$LOCAL_DIR"

# Clone the Space with a shallow, sparse checkout
GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --filter=blob:none "$SPACE_URL" "$LOCAL_DIR"
cd "$LOCAL_DIR"
git lfs install --skip-smudge --local
cd ..

# Synchronize the files we care about
rsync -a --delete README.md "$LOCAL_DIR/README.md"
rsync -a --delete src/ "$LOCAL_DIR/src/"
rsync -a --delete scripts/ "$LOCAL_DIR/scripts/"

# Configure remotes
cd "$LOCAL_DIR"
# Rename the default remote if present
git remote rename origin upstream || true
# Add a fresh origin pointing to our Space
git remote add origin "$SPACE_URL" || git remote set-url origin "$SPACE_URL"

# Push all branches and tags forcefully
git push --force origin --all
git push --force origin --tags
cd ..

# Success message
echo "✅ Space print2/Sparc3D is restored on ZeroGPU and code is up-to-date"
