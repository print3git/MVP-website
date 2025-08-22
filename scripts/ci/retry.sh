#!/usr/bin/env bash
set -euo pipefail

retries=2
backoff=5

while [[ $# -gt 0 ]]; do
  case "$1" in
    --retries)
      retries="$2"
      shift 2
      ;;
    --backoff)
      backoff="${2%s}"
      shift 2
      ;;
    --)
      shift
      break
      ;;
    *)
      break
      ;;
  esac
done

cmd=("$@")
attempt=0
until "${cmd[@]}"; do
  status=$?
  attempt=$((attempt+1))
  if (( attempt > retries )); then
    exit $status
  fi
  echo "attempt $attempt/$retries failed with $status, retrying in ${backoff}s" >&2
  sleep "$backoff"
done
