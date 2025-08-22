#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${repo_url}"
LABELS="${labels}"

if [ -z "${GITHUB_PAT:-}" ]; then
  echo "GITHUB_PAT not set" >&2
  exit 1
fi

echo "Requesting registration token for ${REPO_URL}"
TOKEN=$(curl -fsSL -X POST -H "Authorization: Bearer ${GITHUB_PAT}" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/${REPO_URL#https://github.com/}/actions/runners/registration-token" | jq -r .token)

cleanup() {
  ./config.sh remove --token "$TOKEN" || true
}
trap cleanup EXIT

export RUNNER_ALLOW_RUNASROOT=1
export RUNNER_LABELS="$LABELS"

./config.sh --url "$REPO_URL" --token "$TOKEN" --ephemeral --unattended --labels "$LABELS"
./run.sh
