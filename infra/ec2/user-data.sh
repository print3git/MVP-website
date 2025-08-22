#!/usr/bin/env bash
set -euo pipefail

LOG_DIR=/var/log/gh-runner
mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_DIR/bootstrap.log") 2>&1

IMDS=http://169.254.169.254/latest
TOKEN="$(curl -s -X PUT -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" "$IMDS/api/token" || true)"

get_tag() {
  local key="$1"
  local val="${!key:-}"
  if [ -z "$val" ] && [ -n "$TOKEN" ]; then
    val="$(curl -fs -H "X-aws-ec2-metadata-token: $TOKEN" "$IMDS/meta-data/tags/instance/$key" || true)"
  fi
  echo "$val"
}

GITHUB_OWNER="$(get_tag GITHUB_OWNER)"
GITHUB_REPO="$(get_tag GITHUB_REPO)"
GITHUB_LABELS="$(get_tag GITHUB_LABELS)"
GITHUB_LABELS="${GITHUB_LABELS:-self-hosted,linux,x64,aws-runner}"
RUNNER_NAME="$(get_tag RUNNER_NAME)"
if [ -z "$RUNNER_NAME" ] && [ -n "$TOKEN" ]; then
  RUNNER_NAME="$(curl -fs -H "X-aws-ec2-metadata-token: $TOKEN" "$IMDS/meta-data/instance-id" || true)"
fi
RUNNER_VERSION="${RUNNER_VERSION:-2.317.0}"

apt-get update -y
apt-get install -y curl jq tar >/dev/null

mkdir -p /opt/actions-runner
cd /opt/actions-runner
if [ ! -f ./run.sh ]; then
  curl -L -o actions-runner.tar.gz "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
  tar xzf actions-runner.tar.gz
  rm actions-runner.tar.gz
fi
mkdir -p _work

get_token() {
  if [ -n "${SSM_TOKEN_PATH:-}" ]; then
    aws ssm get-parameter --name "$SSM_TOKEN_PATH" --with-decryption --query Parameter.Value --output text
  elif [ -n "${GITHUB_PAT:-}" ]; then
    curl -fs -X POST -H "Authorization: token $GITHUB_PAT" \
      "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runners/registration-token" | jq -r .token
  fi
}

if [ ! -f .runner ]; then
  TOKEN_VAL="$(get_token)"
  if [ -z "$TOKEN_VAL" ]; then
    echo "Runner token not provided" >&2
    exit 1
  fi
  ./config.sh --url "https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}" \
    --token "$TOKEN_VAL" \
    --name "$RUNNER_NAME" \
    --labels "$GITHUB_LABELS" \
    --work _work \
    --ephemeral
fi

cat > /opt/actions-runner/.env <<ENV
GITHUB_OWNER=${GITHUB_OWNER}
GITHUB_REPO=${GITHUB_REPO}
GITHUB_LABELS=${GITHUB_LABELS}
RUNNER_NAME=${RUNNER_NAME}
SSM_TOKEN_PATH=${SSM_TOKEN_PATH:-}
GITHUB_PAT=${GITHUB_PAT:-}
ENV

