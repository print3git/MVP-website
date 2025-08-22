#!/usr/bin/env bash
set -euo pipefail

trap '/opt/actions-runner/svc.sh stop || true; /opt/actions-runner/svc.sh uninstall || true' EXIT

# Install Node.js 20 and pnpm 9
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get update
apt-get install -y nodejs docker.io jq
npm install -g pnpm@9

# Install Playwright dependencies
npx --yes playwright install-deps

# Download and install GitHub Actions runner
RUNNER_VERSION="2.317.0"
useradd -m runner || true
cd /opt
curl -L -o actions-runner.tar.gz https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz
mkdir -p actions-runner
cd actions-runner
tar xzf ../actions-runner.tar.gz
./bin/installdependencies.sh

# Assume role to retrieve registration token from SSM
ROLE_ARN="${RUNNER_ROLE_ARN}"
CREDS=$(aws sts assume-role --role-arn "$ROLE_ARN" --role-session-name github-runner)
export AWS_ACCESS_KEY_ID=$(echo "$CREDS" | jq -r .Credentials.AccessKeyId)
export AWS_SECRET_ACCESS_KEY=$(echo "$CREDS" | jq -r .Credentials.SecretAccessKey)
export AWS_SESSION_TOKEN=$(echo "$CREDS" | jq -r .Credentials.SessionToken)
TOKEN=$(aws ssm get-parameter --name /github/runner/token --with-decryption --query Parameter.Value --output text)

# Configure runner as ephemeral
./config.sh --url https://github.com/${GITHUB_OWNER}/${GITHUB_REPO} \
  --token "$TOKEN" \
  --labels "${RUNNER_LABEL},linux" \
  --unattended --ephemeral
./svc.sh install
./svc.sh start
