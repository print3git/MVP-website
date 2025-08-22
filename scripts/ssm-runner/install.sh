#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
USER_DATA="$SCRIPT_DIR/user-data.sh"

OWNER=${GITHUB_OWNER:?GITHUB_OWNER not set}
REPO=${GITHUB_REPO:?GITHUB_REPO not set}
TOKEN_API="https://api.github.com/repos/$OWNER/$REPO/actions/runners/registration-token"

: "${GH_TOKEN:?GH_TOKEN not set}"

runner_token="$(curl -fsSL -X POST -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" "$TOKEN_API" | jq -r '.token')"
install -m 600 /dev/null /run/gha-token
printf '%s' "$runner_token" > /run/gha-token

declare -fx GITHUB_OWNER GITHUB_REPO
trap 'rm -f /run/gha-token' EXIT
GITHUB_OWNER="$OWNER" GITHUB_REPO="$REPO" bash "$USER_DATA"
