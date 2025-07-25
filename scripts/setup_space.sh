#!/usr/bin/env bash
set -euo pipefail
HF_TOKEN="${HF_TOKEN:-${HF_API_KEY:-}}"
if [[ -z "$HF_TOKEN" ]]; then
  echo "HF_TOKEN or HF_API_KEY must be set" >&2
  exit 1
fi

trap 'echo "\e[31mError on line $LINENO: $BASH_COMMAND\e[0m" >&2' ERR

# Ensure the script lives under scripts/
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ "$(basename "$SCRIPT_DIR")" != "scripts" ]]; then
  echo "setup_space.sh must reside in the scripts/ directory" >&2
  exit 1
fi

# Pull environment variables once
SPACE_REPO="${SPACE_REPO:-print2/Sparc3D}"
SPACE_URL="${SPACE_URL:-https://huggingface.co/spaces/${SPACE_REPO}.git}"

# Install required tools if missing
if ! command -v huggingface-cli >/dev/null 2>&1; then
  echo "huggingface-cli not found. Installing..." >&2
  pip install --user --quiet huggingface_hub
fi

if ! command -v git-lfs >/dev/null 2>&1; then
  echo "git-lfs not found. Installing..." >&2
  sudo apt-get update -y && sudo apt-get install -y git-lfs
fi

# Verify write scope on the token
SCOPES=$(huggingface-cli whoami --token "$HF_TOKEN" 2>/dev/null | grep -i scopes || true)
if ! echo "$SCOPES" | grep -q write; then
  echo "\u274c token lacks write scope - proceeding anyway" >&2
fi

# Create the Space if missing
if ! huggingface-cli repo info "$SPACE_REPO" --repo-type space >/dev/null 2>&1; then
  huggingface-cli repo create "$SPACE_REPO" --repo-type space --private --space_sdk gradio -y || true
fi

# Remove old clone
rm -rf Sparc3D-Space

# Clone with blob filtering and skip LFS smudge
GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --filter=blob:none "https://user:$HF_TOKEN@${SPACE_URL#https://}" Sparc3D-Space
cd Sparc3D-Space
git lfs install --skip-smudge --local
cd ..

# Rsync files
rsync -a README.md src/ scripts/ Sparc3D-Space/

cd Sparc3D-Space

# Rename remotes and push
git remote rename origin upstream 2>/dev/null || true
git remote add origin "https://user:$HF_TOKEN@${SPACE_URL#https://}"

git add .
if ! git diff --cached --quiet; then
  git commit -m "Sync $(date -Iseconds)"
fi

git push origin HEAD:main --tags

# Ensure the Space stays awake
bash "$(dirname "$0")/check_sleep_zero.sh" || true

# Green success banner
printf '\e[32m%s\e[0m\n' 'Space setup completed successfully'
