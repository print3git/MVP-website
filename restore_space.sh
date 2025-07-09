#!/usr/bin/env bash
# Restore the Sparc3D Hugging Face Space and push local code.
# This script recreates the Space on the free tier and syncs our local files.

set -euo pipefail

# Fetch the HF token and export it for downstream commands
export HF_TOKEN=${HF_TOKEN}
export HF_API_KEY="$HF_TOKEN"

SPACE_REPO="print2/Sparc3D"
LOCAL_DIR="Sparc3D-Space"
SPACE_URL="https://user:${HF_TOKEN}@huggingface.co/spaces/${SPACE_REPO}.git"

# Create or recreate the Space repository on Hugging Face
huggingface-cli repo create "$SPACE_REPO" --type space --private -y
# Ensure the Space uses ZeroGPU hardware
huggingface-cli repo update "$SPACE_REPO" \
  --hardware zero-gpu \
  --sleep-after 0 \
  --token "$HF_TOKEN"

# Remove any existing local clone
rm -rf "$LOCAL_DIR"

# Clone the Space with a shallow, sparse checkout
GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --filter=blob:none "$SPACE_URL" "$LOCAL_DIR"
cd "$LOCAL_DIR"
git lfs install --skip-smudge --local
cd ..

# Synchronize the files we care about
rsync -a --delete app.py "$LOCAL_DIR/app.py"
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
