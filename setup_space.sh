#!/usr/bin/env bash
set -euo pipefail
HF_TOKEN="${HF_TOKEN:-${HF_API_KEY:-}}"
if [[ -z "$HF_TOKEN" ]]; then
  echo "HF_TOKEN or HF_API_KEY must be set" >&2
  exit 1
fi
SCOPES=$(huggingface-cli whoami --token "$HF_TOKEN" 2>/dev/null | grep -i "scopes" || true)
if ! echo "$SCOPES" | grep -q "write"; then
  echo "Token must have write scope" >&2
  exit 1
fi

SPACE_REPO="print2/Sparc3D"
SPACE_URL="https://huggingface.co/spaces/$SPACE_REPO.git"
LOCAL_DIR="Sparc3D-Space"

# Create space if it does not exist
if ! huggingface-cli repo info "$SPACE_REPO" --type space >/dev/null 2>&1; then
  huggingface-cli repo create "$SPACE_REPO" \
  --repo-type space \
  --sdk gradio \
  --private \
  --yes

fi

# Remove existing local directory
rm -rf "$LOCAL_DIR"

# Clone space repository
GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --filter=blob:none "$SPACE_URL" "$LOCAL_DIR"
cd "$LOCAL_DIR"
git lfs install --skip-smudge --local
cd ..

# Sync files
[[ -f app.py ]] && rsync -a --delete app.py "$LOCAL_DIR/app.py"
[[ -f README.md ]] && rsync -a --delete README.md "$LOCAL_DIR/README.md"
[[ -d src ]] && rsync -a --delete src/ "$LOCAL_DIR/src/"
[[ -d scripts ]] && rsync -a --delete scripts/ "$LOCAL_DIR/scripts/"

cd "$LOCAL_DIR"

git add .
COMMIT_MSG="Sync from Codespace $(date -Iseconds)"
 git commit -m "$COMMIT_MSG" || true
 git push origin main --tags
cd ..

# Success banner
echo "===== Sync complete ====="
echo "Local path: $(realpath "$LOCAL_DIR")"
echo "Space URL: $SPACE_URL"
echo "Open the Space in the browser → Settings → Hardware to pick GPU tier when needed."
