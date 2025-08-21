#!/bin/bash
set -euo pipefail

# Install prerequisites.
dnf update -y
dnf install -y git curl tar jq

curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

# Download and extract the latest runner.
mkdir -p /actions-runner
cd /actions-runner
RUNNER_VERSION=$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest | grep tag_name | cut -d '"' -f4)
ARCH="linux-x64"
curl -fsSL -o actions-runner.tar.gz https://github.com/actions/runner/releases/download/${RUNNER_VERSION}/actions-runner-${ARCH}-${RUNNER_VERSION#v}.tar.gz
tar xzf actions-runner.tar.gz
./bin/installdependencies.sh

# Wrapper script to register the runner in ephemeral mode each time the
# service starts. Every job runs on a clean environment and the runner
# unregisters itself when finished. The tradeoff is higher startup time and
# loss of cross-job caching.
cat >launch-runner.sh <<EOF
#!/usr/bin/env bash
set -euo pipefail
REPO_URL="https://github.com/${repo_owner}/${repo_name}"
LABELS="${labels}"

# Fetch a fresh registration token on each invocation. Requires a PAT with
# repo admin permissions supplied via GITHUB_TOKEN_FOR_RUNNER_ADMIN.
token=\$(curl -fsSL -X POST \
  -H "Authorization: Bearer \${GITHUB_TOKEN_FOR_RUNNER_ADMIN}" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${repo_owner}/${repo_name}/actions/runners/registration-token" \
  | jq -r .token)

./config.sh \
  --url "\${REPO_URL}" \
  --token "\${token}" \
  --labels "\${LABELS}" \
  --ephemeral \
  --unattended

# Remove runner configuration on exit to keep the filesystem clean.
trap './config.sh remove --unattended || true' EXIT

exec ./run.sh --once
EOF
chmod +x launch-runner.sh

# systemd unit that invokes the wrapper above. Restarting the service after
# each job triggers re-registration of a new ephemeral runner.
cat >/etc/systemd/system/github-runner.service <<'EOF'
[Unit]
Description=GitHub Actions Runner (ephemeral)
After=network.target

[Service]
Type=simple
WorkingDirectory=/actions-runner
ExecStart=/actions-runner/launch-runner.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now github-runner.service
