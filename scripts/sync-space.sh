#!/bin/bash
set -euo pipefail

# Clone the Space repository if it doesn't already exist
if [ ! -d "Sparc3D-Space" ]; then
  git clone --depth 1 https://huggingface.co/spaces/print2/Sparc3D Sparc3D-Space
fi

cd Sparc3D-Space

# Rename default remote to upstream
if git remote | grep -q '^origin$'; then
  git remote rename origin upstream
fi

# Add new origin pointing to the model repo
if git remote | grep -q '^origin$'; then
  git remote set-url origin https://huggingface.co/print2/Sparc3D.git
else
  git remote add origin https://huggingface.co/print2/Sparc3D.git
fi

# Push all branches and tags to the new origin
git push origin --all
git push origin --tags

# Print success message with remote URLs
printf '\nSpace synced successfully.\n'
printf '  origin: %s\n' "$(git remote get-url origin)"
printf 'upstream: %s\n' "$(git remote get-url upstream)"
