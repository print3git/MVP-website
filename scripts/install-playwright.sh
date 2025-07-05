#!/bin/bash
set -e
if [ -z "$SKIP_PW_DEPS" ]; then
  npx playwright install "$@" --with-deps
else
  npx playwright install "$@"
fi
