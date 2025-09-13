#!/bin/bash
set -e

# Navigate to repository root
cd "$(git rev-parse --show-toplevel)"

# Silence npm proxy warnings and trust mise config
unset npm_config_http_proxy npm_config_https_proxy
mise trust >/dev/null 2>&1 || true

# Clean previous test artefacts without relying on rimraf
rm -rf coverage backend/coverage frontend/coverage test-dist >/dev/null 2>&1 || true

# Run tests for backend and root
npm test --prefix backend
npm test
