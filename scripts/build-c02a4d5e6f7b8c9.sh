#!/usr/bin/env bash
set -euo pipefail
rm -rf dist
mkdir -p dist
rsync -av --exclude='backend' --exclude='node_modules' --exclude='dist' --exclude='.git' --exclude='.github' --exclude='infra' --exclude='deploy' --exclude='scripts' --exclude='test' --exclude='tests' --exclude='docs' ./ dist/
