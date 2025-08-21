#!/bin/bash
set -euxo pipefail

dnf update -y
dnf install -y curl tar jq

useradd -m runner
cd /home/runner
RUNNER_VERSION="2.317.0"
curl -L -o actions-runner.tar.gz https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz
tar xzf actions-runner.tar.gz

REGION="$(curl -s http://169.254.169.254/latest/dynamic/instance-identity/document | jq -r .region)"
TOKEN=$(aws ssm get-parameter --name "${ssm_token_parameter}" --with-decryption --region "$REGION" --query Parameter.Value --output text)

chown -R runner:runner /home/runner
runuser -l runner -c "./bin/installdependencies.sh"
runuser -l runner -c "./config.sh --url https://github.com/${repo_owner}/${repo_name} --token $TOKEN --labels ${labels} --unattended --ephemeral"
runuser -l runner -c "./run.sh &"
