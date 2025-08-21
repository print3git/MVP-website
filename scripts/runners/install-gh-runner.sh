#!/usr/bin/env bash
set -euo pipefail

# Placeholder configuration. Update before running.
GITHUB_URL="https://github.com/my-org/my-repo"
GITHUB_TOKEN="" # TODO: Paste the GitHub token from the GitHub UI.
RUNNER_NAME="$(hostname)-$(openssl rand -hex 4)"
RUNNER_LABELS="aws,ec2,self-hosted"

RUNNER_DIR="/opt/actions-runner"

# Install required packages
sudo apt-get update
sudo apt-get install -y curl jq

# Download latest runner release
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"
LATEST_URL="$(curl -s https://api.github.com/repos/actions/runner/releases/latest | jq -r '.assets[] | select(.name | test("linux-x64")) | .browser_download_url')"
curl -L "$LATEST_URL" -o actions-runner.tar.gz
tar xzf actions-runner.tar.gz
rm actions-runner.tar.gz

# Configure the runner
./config.sh --url "$GITHUB_URL" --token "$GITHUB_TOKEN" --name "$RUNNER_NAME" --labels "$RUNNER_LABELS" --unattended

# Install and start the service
sudo ./svc.sh install
sudo ./svc.sh start
