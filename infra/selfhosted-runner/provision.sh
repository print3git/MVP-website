#!/usr/bin/env bash
set -euo pipefail

# Install GitHub Actions runner dependencies
apt-get update
apt-get install -y --no-install-recommends \
  curl jq tar unzip build-essential ca-certificates gnupg

# Install Node.js 20 from NodeSource if missing
if ! command -v node >/dev/null 2>&1 || ! node --version | grep -q '^v20\.'; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# Install pnpm via corepack
corepack enable >/dev/null 2>&1
corepack prepare pnpm@latest --activate >/dev/null 2>&1

# Install Docker if not present
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

# Verify installations
node --version
pnpm --version
docker --version
curl --version
jq --version
tar --version
unzip -v | head -n1
gcc --version | head -n1
