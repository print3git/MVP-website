#!/bin/bash
set -euo pipefail

SPACE_DIR="Sparc3D-Space"
SPACE_URL="https://huggingface.co/spaces/print2/Sparc3D"
MODEL_URL="https://huggingface.co/print2/Sparc3D.git"

# Clone the Space repository without heavy assets if it doesn't already exist
if [ ! -d "$SPACE_DIR" ]; then
  git clone --depth 1 --filter=blob:none "$SPACE_URL" "$SPACE_DIR"
fi

cd "$SPACE_DIR"

# Only check out the code directories to avoid heavy assets
git sparse-checkout init --cone
git sparse-checkout set src scripts

# Rename default remote to upstream
if git remote | grep -q '^origin$'; then
  git remote rename origin upstream
fi

# Add new origin pointing to the model repo
if git remote | grep -q '^origin$'; then
  git remote set-url origin "$MODEL_URL"
else
  git remote add origin "$MODEL_URL"
fi

# Push all branches and tags to the new origin
git push origin --all
git push origin --tags

# Print success message with remote URLs
printf '\nSpace synced successfully.\n'
printf '  origin: %s\n' "$(git remote get-url origin)"
printf 'upstream: %s\n' "$(git remote get-url upstream)"
