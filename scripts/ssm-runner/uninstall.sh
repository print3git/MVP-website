#!/usr/bin/env bash
set -euo pipefail

OWNER=${GITHUB_OWNER:?GITHUB_OWNER not set}
REPO=${GITHUB_REPO:?GITHUB_REPO not set}
: "${GH_TOKEN:?GH_TOKEN not set}"

RUNNER_NAME="mvp-gh-runner"
SERVICE_NAME="actions.runner.${OWNER}-${REPO}.${RUNNER_NAME}.service"
RUNNER_DIR="/opt/actions-runner"

systemctl stop "$SERVICE_NAME" 2>/dev/null || true

if [[ -d "$RUNNER_DIR" ]]; then
  cd "$RUNNER_DIR"
  if [[ -f .runner ]]; then
    rid="$(curl -fsSL -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/$OWNER/$REPO/actions/runners" | jq -r ".runners[] | select(.name==\"$RUNNER_NAME\") | .id")"
    if [[ -n "$rid" ]]; then
      curl -fsSL -X DELETE -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/$OWNER/$REPO/actions/runners/$rid" >/dev/null
    fi
    remove_token="$(curl -fsSL -X POST -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/$OWNER/$REPO/actions/runners/remove-token" | jq -r '.token')"
    ./config.sh remove --token "$remove_token" >/dev/null 2>&1 || true
  fi
  ./svc.sh uninstall >/dev/null 2>&1 || true
fi

rm -rf "$RUNNER_DIR"
