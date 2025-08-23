#!/usr/bin/env bash
# Bootstrap GitHub Actions runner on an EC2 instance via SSM.
# Expects the following env vars:
#   RUNNER_TOKEN - GitHub runner registration token (required)
#   REPO_URL     - Repository URL, e.g. https://github.com/owner/repo (required)
#   LABELS       - Runner labels (comma-separated)
#   RUNNER_USER  - Username to own the runner (default actions-runner)
#   RUNNER_VERSION - Runner version or "latest" (default latest)
set -euo pipefail
LOG_FILE=/var/log/actions-runner-bootstrap.log
exec > >(tee -a "$LOG_FILE") 2>&1

USER_NAME="${RUNNER_USER:-actions-runner}"
HOME_DIR="/opt/$USER_NAME"
RUNNER_DIR="$HOME_DIR/actions-runner"
TOKEN="${RUNNER_TOKEN:?RUNNER_TOKEN not set}"
REPO_URL="${REPO_URL:?REPO_URL not set}"
LABELS="${LABELS:-self-hosted,linux,x64}"
VERSION="${RUNNER_VERSION:-latest}"

# Install dependencies
if command -v apt-get >/dev/null; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y >/dev/null
  apt-get install -y curl jq tar sudo >/dev/null
elif command -v yum >/dev/null; then
  yum install -y curl jq tar sudo >/dev/null
fi

# Ensure user exists
if ! id "$USER_NAME" >/dev/null 2>&1; then
  useradd --system --create-home --home-dir "$HOME_DIR" --shell /bin/bash "$USER_NAME"
fi

mkdir -p "$RUNNER_DIR"
chown "$USER_NAME":"$USER_NAME" "$RUNNER_DIR"
cd "$RUNNER_DIR"

# Determine runner version
if [[ "$VERSION" == "latest" ]]; then
  VERSION=$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest | jq -r '.tag_name' | sed 's/^v//')
fi
RUNNER_TGZ="actions-runner-linux-x64-${VERSION}.tar.gz"
RUNNER_URL="https://github.com/actions/runner/releases/download/v${VERSION}/${RUNNER_TGZ}"

current=""
if [[ -x ./bin/Runner.Listener ]]; then
  current=$(./bin/Runner.Listener --version || true)
fi
if [[ "$current" != "$VERSION" ]]; then
  rm -rf ./*
  curl -fsSL "$RUNNER_URL" -o "$RUNNER_TGZ"
  tar -xzf "$RUNNER_TGZ"
  rm "$RUNNER_TGZ"
  chown -R "$USER_NAME":"$USER_NAME" .
fi

# Configure runner idempotently
if [[ ! -f .runner ]]; then
  sudo -u "$USER_NAME" ./config.sh \
    --url "$REPO_URL" \
    --token "$TOKEN" \
    --labels "$LABELS" \
    --unattended \
    --ephemeral false
fi

# systemd unit
cat >/etc/systemd/system/actions-runner.service <<SERVICE
[Unit]
Description=GitHub Actions Runner
After=network.target

[Service]
User=$USER_NAME
WorkingDirectory=$RUNNER_DIR
ExecStart=$RUNNER_DIR/run.sh
Restart=always

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable actions-runner
systemctl restart actions-runner
