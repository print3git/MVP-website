#!/bin/bash
set -euo pipefail

yum update -y
yum install -y curl jq tar

# Fetch repo and token info from SSM
CONFIG=$(aws ssm get-parameter --name "${ssm_param}" --query 'Parameter.Value' --output text)
REPO_URL=$(echo "$CONFIG" | jq -r '.repo_url')
TOKEN_URL=$(echo "$CONFIG" | jq -r '.token_path')

cd /opt
curl -fsSL https://github.com/actions/runner/releases/latest/download/actions-runner-linux-x64.tar.gz | tar xz
cd actions-runner

TOKEN=$(curl -fsSL -X POST "$TOKEN_URL" | jq -r '.token')
./config.sh --url "$REPO_URL" --token "$TOKEN" --labels "self-hosted,linux,aws-ephemeral" --unattended --ephemeral
./run.sh --once
shutdown -h now
