#!/bin/bash
set -e
cd "$(git rev-parse --show-toplevel)"
unset npm_config_http_proxy npm_config_https_proxy
mise use -g node@20 >/dev/null
npm run validate-env >/dev/null
npm test --prefix backend "$@" | tee /tmp/test.log
