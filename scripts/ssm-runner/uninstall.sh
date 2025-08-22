#!/usr/bin/env bash
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-mvpstudio/MVP-website}"
TOKEN="${1:-${GH_RUNNER_TOKEN:-}}"
LABEL="mvp-gh-runner"
RUNNER_DIR=/opt/actions-runner
SERVICE="actions.runner.${REPO//\//.}.${LABEL}.service"

cd "$RUNNER_DIR"

if systemctl list-units --full -all | grep -Fq "$SERVICE"; then
  systemctl stop "$SERVICE" || true
  ./svc.sh uninstall "$SERVICE" || true
fi

if [ -f .runner ] && [ -n "$TOKEN" ]; then
  ./config.sh remove --token "$TOKEN" --unattended || true
fi
