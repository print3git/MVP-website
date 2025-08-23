#!/usr/bin/env bash
set -euo pipefail

# Environment variables:
#   GH_REPO (e.g. owner/repo) [required]
#   RUNNER_LABELS (default: "mvp-gh-runner,linux,x64")
#   RUNNER_VERSION (default: latest)
#   GH_PAT_SSM_PARAM (optional SSM Parameter for GH PAT)
#   GH_PAT (fallback PAT if GH_PAT_SSM_PARAM not set)

RUNNER_LABELS=${RUNNER_LABELS:-mvp-gh-runner,linux,x64}
RUNNER_VERSION=${RUNNER_VERSION:-latest}

sudo dnf install -y curl tar jq >/dev/null

# Resolve runner version
if [[ "$RUNNER_VERSION" == "latest" ]]; then
  RUNNER_VERSION=$(curl -sL https://api.github.com/repos/actions/runner/releases/latest | jq -r .tag_name)
fi
RUNNER_VERSION_NO_V=${RUNNER_VERSION#v}

fetch_pat() {
  if [[ -n "${GH_PAT_SSM_PARAM:-}" && $(command -v aws >/dev/null 2>&1; echo $?) -eq 0 ]]; then
    aws ssm get-parameter --name "$GH_PAT_SSM_PARAM" --with-decryption --query Parameter.Value --output text
  else
    echo "${GH_PAT:-}" | sed -e 's/^\s*//' -e 's/\s*$//'
  fi
}

PAT=$(fetch_pat)
if [[ -z "$PAT" ]]; then
  echo "GH_PAT or GH_PAT_SSM_PARAM must be provided" >&2
  exit 1
fi

REG_TOKEN=$(curl -sX POST -H "Authorization: token $PAT" "https://api.github.com/repos/$GH_REPO/actions/runners/registration-token" | jq -r .token)

INSTALL_DIR=/opt/github-runner
if ! id -u github-runner >/dev/null 2>&1; then
  sudo useradd --system --create-home --home-dir "$INSTALL_DIR" github-runner
fi
sudo mkdir -p "$INSTALL_DIR"
sudo chown github-runner:github-runner "$INSTALL_DIR"
cd "$INSTALL_DIR"

if [[ ! -f .runner ]]; then
  curl -L -o actions-runner.tar.gz "https://github.com/actions/runner/releases/download/$RUNNER_VERSION/actions-runner-linux-x64-$RUNNER_VERSION_NO_V.tar.gz"
  sudo -u github-runner tar xzf actions-runner.tar.gz
  sudo -u github-runner ./config.sh --unattended --url "https://github.com/$GH_REPO" --token "$REG_TOKEN" --labels "$RUNNER_LABELS" --name "$(hostname)-$(uuidgen | cut -d- -f1)"
fi

sudo tee /etc/systemd/system/github-runner.service >/dev/null <<'UNIT'
[Unit]
Description=GitHub Actions Runner
After=network.target

[Service]
User=github-runner
WorkingDirectory=/opt/github-runner
ExecStart=/opt/github-runner/run.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now github-runner
sudo systemctl status github-runner --no-pager || true
journalctl -u github-runner -n 50 --no-pager || true
