#!/bin/bash
set -e
unset npm_config_http_proxy npm_config_https_proxy
npm ci
npm ci --prefix backend
if [ -f backend/hunyuan_server/package.json ]; then
  npm ci --prefix backend/hunyuan_server
fi
