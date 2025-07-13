#!/bin/bash
set -e

# Abort if Playwright packages are not installed. Running `npx playwright install`
# without them triggers warnings and fetches the CLI from the network.
if [ ! -x node_modules/.bin/playwright ]; then
  echo "Playwright package missing. Run 'npm install' first." >&2
  exit 1
fi

if [ -z "$SKIP_PW_DEPS" ]; then
  npx playwright install "$@" --with-deps
else
  npx playwright install "$@"
fi
