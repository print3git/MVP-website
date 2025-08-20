#!/usr/bin/env bash
set -euo pipefail

LOG_FILE=${DIAG_LOG:-/tmp/diagnostics.log}
SERVER_LOG=${SERVER_LOG:-/tmp/server.log}
exec > >(tee -a "$LOG_FILE") 2>&1

if [[ -f .env ]]; then
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^\s*# || -z "$key" ]] && continue
    if [ -z "${!key+x}" ]; then
      export "$key"="$value"
    fi
  done < .env
fi

banner() {
  echo -e "\n==============================\n$1\n==============================";
}

timings=()
time_stage() {
  local name=$1
  shift
  local start=$(date +%s)
  "$@"
  local status=$?
  local end=$(date +%s)
  timings+=("$name:$((end-start))")
  return $status
}

banner "Running environment validation"
# Source validate-env so exported variables persist in this script
time_stage "validate_env" source scripts/validate-env.sh

banner "Starting dev server"
start=$(date +%s)
pnpm dev &> "$SERVER_LOG" &
SERVER_PID=$!
trap 'kill $SERVER_PID' EXIT

echo "Waiting for port 3000..."
for i in {1..30}; do
  if nc -z localhost 3000; then break; fi
  sleep 1
done
timings+=("server_start:$(( $(date +%s)-start ))")

set +e
time_stage "pipeline" node scripts/test-full-pipeline.js
PIPELINE_STATUS=$?

JEST_JSON=/tmp/jest-results.json
time_stage "tests" node scripts/run-jest.js --json --outputFile "$JEST_JSON" tests/**/*.js tests/**/*.ts --runInBand
TEST_STATUS=$?
node scripts/flaky-test-detector.js "$JEST_JSON" || true
set -e

banner "Stage timings"
for t in "${timings[@]}"; do
  IFS=":" read -r name dur <<< "$t"
  echo "$name took ${dur}s"
done

banner "Last 200 lines of server log"
tail -n 200 "$SERVER_LOG" || true

if [[ $PIPELINE_STATUS -eq 0 && $TEST_STATUS -eq 0 ]]; then
  banner "DIAGNOSTICS PASSED"
  exit 0
else
  banner "DIAGNOSTICS FAILED"
  exit 1
fi

