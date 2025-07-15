#!/usr/bin/env bash
set -euo pipefail

if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

banner() {
  echo -e "\n==============================\n$1\n==============================";
}

banner "Running environment validation"
# Source validate-env so exported variables persist in this script
source scripts/validate-env.sh

banner "Starting dev server"
pnpm dev &
SERVER_PID=$!
trap 'kill $SERVER_PID' EXIT

echo "Waiting for port 3000..."
for i in {1..30}; do
  if nc -z localhost 3000; then break; fi
  sleep 1
done

set +e
node scripts/test-full-pipeline.js
PIPELINE_STATUS=$?

node scripts/run-jest.js tests/**/*.js tests/**/*.ts --runInBand
TEST_STATUS=$?
set -e

if [[ $PIPELINE_STATUS -eq 0 && $TEST_STATUS -eq 0 ]]; then
  banner "DIAGNOSTICS PASSED"
  exit 0
else
  banner "DIAGNOSTICS FAILED"
  exit 1
fi

