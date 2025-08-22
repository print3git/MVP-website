#!/usr/bin/env bash
set -euo pipefail

RUNNER_DIR="/opt/actions-runner"
RUNNER_NAME="mvp-gh-runner"
TOKEN_FILE="/run/gha-token"

if [[ -f "$TOKEN_FILE" ]]; then
  GITHUB_RUNNER_TOKEN="$(cat "$TOKEN_FILE")"
  rm -f "$TOKEN_FILE"
elif [[ -n "${GITHUB_RUNNER_TOKEN:-}" ]]; then
  :
else
  echo "Registration token not provided" >&2
  exit 1
fi

OWNER=${GITHUB_OWNER:?GITHUB_OWNER not set}
REPO=${GITHUB_REPO:?GITHUB_REPO not set}
REPO_SLUG="$OWNER/$REPO"
SERVICE_NAME="actions.runner.${OWNER}-${REPO}.${RUNNER_NAME}.service"

corepack enable >/dev/null 2>&1 || true
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

installed=""
if [[ -x ./bin/Runner.Listener ]]; then
  installed="$(./bin/Runner.Listener --version || true)"
fi
latest_json="$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest)"
latest_ver="$(echo "$latest_json" | jq -r '.tag_name' | tr -d 'v')"
if [[ "$installed" != "$latest_ver" ]]; then
  systemctl stop "$SERVICE_NAME" 2>/dev/null || true
  rm -rf ./*
  curl -fsSL "$(echo "$latest_json" | jq -r '.assets[] | select(.name | test("linux-x64")) | .browser_download_url')" -o runner.tar.gz
  tar -xzf runner.tar.gz
  rm runner.tar.gz
fi

./config.sh remove --token "$GITHUB_RUNNER_TOKEN" >/dev/null 2>&1 || true
./config.sh --url "https://github.com/$REPO_SLUG" \
  --token "$GITHUB_RUNNER_TOKEN" \
  --name "$RUNNER_NAME" \
  --labels "self-hosted,linux,x64,$RUNNER_NAME" \
  --unattended

unset GITHUB_RUNNER_TOKEN

./svc.sh install "$RUNNER_NAME"
systemctl enable "$SERVICE_NAME"
systemctl start "$SERVICE_NAME"
