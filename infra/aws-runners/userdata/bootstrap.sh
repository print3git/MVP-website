#!/usr/bin/env bash
set -euo pipefail

RUNNER_VERSION="${RUNNER_VERSION:-2.318.0}"
REPO="${REPO:-owner/repo}"
RUNNER_DIR="/opt/actions-runner"

install_deps() {
  apt-get update
  apt-get install -y --no-install-recommends curl jq docker.io
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
  corepack enable
  if [[ "${BUILD_IMAGE:-0}" == "1" ]]; then
    npx --yes playwright install --with-deps
  fi
}

install_runner() {
  mkdir -p "$RUNNER_DIR"
  cd "$RUNNER_DIR"
  curl -fsSL -o actions-runner.tar.gz "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
  tar xzf actions-runner.tar.gz
  rm actions-runner.tar.gz
  ./bin/installdependencies.sh
}

register_runner() {
  cd "$RUNNER_DIR"
  GITHUB_TOKEN=$(aws sts assume-role --role-arn "$GITHUB_OIDC_ROLE_ARN" --role-session-name gha-runner --duration-seconds 900 --query 'Credentials.SessionToken' --output text)
  REG_TOKEN=$(curl -sX POST -H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/${REPO}/actions/runners/registration-token" | jq -r .token)
  ./config.sh --url "https://github.com/${REPO}" --token "$REG_TOKEN" --ephemeral --unattended --labels "${RUNNER_LABELS:-self-hosted,aws}"
}

run_and_cleanup() {
  cd "$RUNNER_DIR"
  ./run.sh --once
  shutdown -h now
}

install_deps
install_runner

if [[ "${BUILD_IMAGE:-0}" != "1" ]]; then
  register_runner
  run_and_cleanup
fi
