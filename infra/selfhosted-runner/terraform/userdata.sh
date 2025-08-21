#!/bin/bash
set -euo pipefail

dnf update -y
dnf install -y git curl tar

curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

RUNNER_VERSION=$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest | grep tag_name | cut -d '"' -f4)
ARCH="linux-x64"
curl -fsSL -o actions-runner.tar.gz https://github.com/actions/runner/releases/download/${RUNNER_VERSION}/actions-runner-${ARCH}-${RUNNER_VERSION#v}.tar.gz
tar xzf actions-runner.tar.gz
./bin/installdependencies.sh

./config.sh --url https://github.com/${repo_owner}/${repo_name} --token ${GH_RUNNER_REG_TOKEN} --labels ${labels} --unattended

./svc.sh install
./svc.sh start
