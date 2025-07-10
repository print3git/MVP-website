#!/usr/bin/env bash
set -euo pipefail

echo "🔎 Running environment validation..."
bash scripts/validate-env.sh

echo "🚀 Spinning up dev server..."
pnpm dev &
SERVER_PID=$!
trap "kill $SERVER_PID" EXIT

echo "⌛ Waiting for port 3000..."
for i in {1..15}; do nc -z localhost 3000 && break; sleep 1; done

echo "🧪 Executing Jest integration tests"
npx jest tests/pipeline.spec.ts --runInBand

echo "✅ Diagnostics complete"
