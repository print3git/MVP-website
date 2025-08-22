#!/usr/bin/env bash
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-mvpstudio/MVP-website}"
TOKEN="${1:-${GH_RUNNER_TOKEN:-}}"
LABEL="mvp-gh-runner"
RUNNER_DIR=/opt/actions-runner
SERVICE="actions.runner.${REPO//\//.}.${LABEL}.service"

if [ -z "$TOKEN" ]; then
  echo "Usage: $0 <token>" >&2
  exit 1
fi

cd "$RUNNER_DIR"

cleanup() {
  if systemctl list-units --full -all | grep -Fq "$SERVICE"; then
    ./svc.sh uninstall "$SERVICE" || true
  fi
  if [ -f .runner ]; then
    ./config.sh remove --token "$TOKEN" || true
  fi
}
trap cleanup ERR

if systemctl is-active --quiet "$SERVICE"; then
  systemctl restart "$SERVICE"
  exit 0
fi

./config.sh --unattended --replace \
  --url "https://github.com/${REPO}" \
  --token "$TOKEN" \
  --labels "self-hosted,linux,x64,${LABEL}"

./svc.sh install "$SERVICE"
systemctl enable "$SERVICE"
systemctl start "$SERVICE"
