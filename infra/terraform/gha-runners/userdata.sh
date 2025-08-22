#!/bin/bash
set -euxo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y curl jq git ca-certificates software-properties-common

if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker ubuntu || true
fi

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pnpm vite playwright
npx playwright install --with-deps

RUNNER_VERSION="2.315.0"
RUNNER_DIR=/opt/actions-runner
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"
curl -L https://github.com/actions/runner/releases/download/v$${RUNNER_VERSION}/actions-runner-linux-x64-$${RUNNER_VERSION}.tar.gz | tar zx --strip-components=1
./bin/installdependencies.sh

REPO_URL="${repo_url}"
RUNNER_GROUP="${runner_group}"
TOKEN=$(curl -fsSL -X POST -H "Authorization: Bearer ${github_token}" "$${REPO_URL}/actions/runners/registration-token" | jq -r .token)

cleanup() {
  ./config.sh remove --token "$TOKEN"
}
trap 'cleanup; exit 130' INT TERM

./config.sh --url "$REPO_URL" --token "$TOKEN" --runnergroup "$RUNNER_GROUP" --labels self-hosted,linux,x64,gha --ephemeral --unattended

while true; do
  ./run.sh || true
  sleep 1
done
