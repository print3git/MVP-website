#!/usr/bin/env bash
set -euxo pipefail

# Basic packages for runner
apt-get update
apt-get install -y curl jq tar

# Enable corepack so pnpm/yarn can be used if needed
if command -v corepack >/dev/null 2>&1; then
  corepack enable || true
fi

RUNNER_DIR=/opt/actions-runner
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

# Download runner if not already present
if [ ! -f bin/Runner.Listener ]; then
  RUNNER_VERSION="${RUNNER_VERSION:-2.311.0}"
  curl -fsSL "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz" -o runner.tgz
  tar xzf runner.tgz
  rm runner.tgz
fi

# Fetch helper scripts from repo main branch
REPO="${GH_REPOSITORY:-mvpstudio/MVP-website}"
BASE="https://raw.githubusercontent.com/${REPO}/main/scripts/ssm-runner"
for f in install.sh uninstall.sh; do
  curl -fsSL "$BASE/$f" -o "/usr/local/bin/$f"
  chmod +x "/usr/local/bin/$f"
  ln -sf "/usr/local/bin/$f" "/usr/local/bin/ssm-runner-${f%.sh}"
done

# If a token is provided via GH_RUNNER_TOKEN, perform install
if [ -n "${GH_RUNNER_TOKEN:-}" ]; then
  /usr/local/bin/install.sh "$GH_RUNNER_TOKEN"
fi

