#!/bin/bash
set -euo pipefail

SPACE_DIR="Sparc3D-Space"
SPACE_URL="https://huggingface.co/spaces/print2/Sparc3D"
MODEL_URL="https://huggingface.co/print2/Sparc3D.git"

# If a Hugging Face token is provided, embed it in the clone URL so the
# operation can run non-interactively.
if [ -n "${HF_API_KEY:-}" ]; then
  AUTH_SPACE_URL="https://user:${HF_API_KEY}@huggingface.co/spaces/print2/Sparc3D"
  AUTH_MODEL_URL="https://user:${HF_API_KEY}@huggingface.co/print2/Sparc3D.git"
else
  AUTH_SPACE_URL="$SPACE_URL"
  AUTH_MODEL_URL="$MODEL_URL"
fi

# Ensure the workspace folder exists. If the repo hasn't been cloned yet, do a
# lightweight clone that skips large LFS files.
if [ ! -d "$SPACE_DIR" ]; then
  # Skip downloading large LFS blobs and only fetch minimal history.
  GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --filter=blob:none "$AUTH_SPACE_URL" "$SPACE_DIR"
  cd "$SPACE_DIR"
  git sparse-checkout init --cone
  # Limit checkout to application code and scripts needed by the Space
  git sparse-checkout set src scripts app.py README.md
else
  cd "$SPACE_DIR"
fi

# Disable LFS smudge for future commands as well
git lfs install --skip-smudge --local

# Rename default remote to upstream
if git remote | grep -q '^origin$'; then
  git remote rename origin upstream
fi

# Add new origin pointing to the model repo
if git remote | grep -q '^origin$'; then
  git remote set-url origin "$AUTH_MODEL_URL"
else
  git remote add origin "$AUTH_MODEL_URL"
fi

# Push all branches and tags to the new origin
git push origin --all
git push origin --tags

# Print success message with remote URLs
printf '\nSpace synced successfully.\n'
origin_url=$(git remote get-url origin)
if [ -n "${HF_API_KEY:-}" ]; then
  origin_url="${origin_url/user:${HF_API_KEY}@/}"
fi
printf '  origin: %s\n' "$origin_url"
printf 'upstream: %s\n' "$(git remote get-url upstream)"
