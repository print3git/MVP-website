#!/bin/bash
set -euo pipefail

# Directory where the Space code lives
SPACE_DIR="Sparc3D-Space"
# Base URLs for cloning and pushing
SPACE_URL="https://huggingface.co/spaces/print2/Sparc3D"
MODEL_URL="https://huggingface.co/print2/Sparc3D.git"

# Use token from HF_TOKEN or HF_API_KEY for authentication
HF_TOKEN="${HF_TOKEN:-${HF_API_KEY:-}}"
if [ -z "$HF_TOKEN" ]; then
  echo "HF_TOKEN or HF_API_KEY must be set for authentication" >&2
  exit 1
fi

# Build authenticated URLs (token omitted from log output)
auth_space_url="https://user:${HF_TOKEN}@${SPACE_URL#https://}"
auth_model_url="https://user:${HF_TOKEN}@${MODEL_URL#https://}"

# Clone repository if the directory doesn't exist
if [ ! -d "$SPACE_DIR" ]; then
  # Perform a shallow, blobless clone and skip Git LFS downloads
  GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --filter=blob:none "$auth_space_url" "$SPACE_DIR"
  cd "$SPACE_DIR"
  # Initialize sparse checkout to include only necessary paths
  git sparse-checkout init --cone
  git sparse-checkout set src scripts app.py README.md
else
  cd "$SPACE_DIR"
fi

# Ensure LFS doesn't download blobs on subsequent operations
git lfs install --skip-smudge --local

# Rename existing origin to upstream if needed
if git remote | grep -q '^origin$'; then
  git remote rename origin upstream
fi

# Configure new origin pointing to the model repo
if git remote | grep -q '^origin$'; then
  git remote set-url origin "$auth_model_url"
else
  git remote add origin "$auth_model_url"
fi

# Push all branches and tags to the new origin
git push origin --all
git push origin --tags

# Success message (hide token)
printf '\nSpace synced successfully.\n'
printf '  origin: %s\n' "$MODEL_URL"
printf 'upstream: %s\n' "$SPACE_URL"

