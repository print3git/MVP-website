#!/usr/bin/env bash
set -euo pipefail

if ! command -v gh >/dev/null; then
  echo "GitHub CLI (gh) is required. Install from https://cli.github.com/ and authenticate with 'gh auth login'."
  exit 1
fi

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
echo "Applying protection rules to $REPO ..."

protect_branch () {
  local BR="$1"
  echo "Protecting branch: $BR"
  gh api -X PUT repos/$REPO/branches/$BR/protection \
    -F required_status_checks.strict=true \
    -F required_status_checks.contexts[]='CI' \
    -F enforce_admins=true \
    -F required_pull_request_reviews.required_approving_review_count=1 \
    -F required_pull_request_reviews.require_code_owner_reviews=false \
    -F restrictions= \
    -F allow_force_pushes=false \
    -F allow_deletions=false \
    -F required_linear_history=true
}

protect_branch dev
protect_branch production

echo "Done. If this fails, ensure you have repo admin rights and 'gh auth status' is OK."
