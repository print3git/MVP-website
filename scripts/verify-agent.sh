#!/bin/sh
set -e

# Verify agent tasks for this repo

cd "$(dirname "$0")/.."

# Install dependencies
npm ci --prefix backend

if [ -f backend/hunyuan_server/package.json ]; then
  npm ci --prefix backend/hunyuan_server
fi

# Format code
npm run format --prefix backend

# Run tests
npm test --prefix backend

# Show diff to confirm no unrelated changes
git status --short
git diff --stat
