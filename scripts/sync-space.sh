#!/usr/bin/env bash
set -euo pipefail
HF_TOKEN="${HF_TOKEN:-${HF_API_KEY:-}}"
if [[ -z "$HF_TOKEN" ]]; then
  echo "HF_TOKEN or HF_API_KEY must be set" >&2
  exit 1
fi

# Fail on any error, undefined variable, or pipe failure

# Disable LFS smudge during clone for speed
export GIT_LFS_SKIP_SMUDGE=1


# Directory where the Space code lives (created if absent)
SPACE_DIR="${SPACE_DIR:-Sparc3D-Space}"

# Base URLs for cloning and pushing (allow override via env)
SPACE_URL="${SPACE_URL:-https://huggingface.co/spaces/print2/Sparc3D}"
MODEL_URL="${MODEL_URL:-https://huggingface.co/print2/Sparc3D.git}"


# Ensure URLs end with .git
[[ $SPACE_URL != *.git ]] && SPACE_URL+=".git"
[[ $MODEL_URL != *.git ]] && MODEL_URL+=".git"

# Authenticated URLs (token hidden in logs)
auth_space_url="https://user:${HF_TOKEN}@${SPACE_URL#https://}"
auth_model_url="https://user:${HF_TOKEN}@${MODEL_URL#https://}"

# Diagnosis checks
auth_status="✔"; url_status="✔"; net_status="✔"; branch_status="✔"

# Basic network test
if ! curl -sfL https://huggingface.co > /dev/null; then
  net_status="✖"
fi

# Auth and URL validity
if ! git ls-remote "$auth_space_url" &>/dev/null; then
  auth_status="✖"; url_status="✖"; net_status="✖"
fi

# Detect default branch
default_branch=$(git ls-remote --symref "$auth_space_url" HEAD 2>/dev/null | sed -n 's@^ref: refs/heads/\(.*\)\s*HEAD$@\1@p')
if [ -z "$default_branch" ]; then
  branch_status="✖"
fi

echo "Diagnosis: auth $auth_status | url $url_status | network $net_status | default branch $branch_status"
if [ "$auth_status" = "✖" ] || [ "$url_status" = "✖" ] || [ "$net_status" = "✖" ] || [ "$branch_status" = "✖" ]; then
  exit 1
fi

# Clone repository if needed using sparse checkout and LFS disabled
if [ ! -d "$SPACE_DIR/.git" ]; then
  rm -rf "$SPACE_DIR"
  GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --filter=blob:none "$auth_space_url" "$SPACE_DIR"
  cd "$SPACE_DIR"
  git sparse-checkout init --cone
  git sparse-checkout set --skip-checks src scripts
else
  cd "$SPACE_DIR"
fi

# Prevent downloading large LFS blobs
git lfs install --skip-smudge --local

# Rename existing origin to upstream if present
git remote rename origin upstream 2>/dev/null || true

# Configure new origin pointing to the model repo
if git remote | grep -qx origin; then
  git remote set-url origin "$auth_model_url"
else
  git remote add origin "$auth_model_url"
fi

# Push all branches and tags to the new origin
git push --force origin --all || true
git push --force origin --tags || true


# Success indicator
echo "✅ sync-space completed"

