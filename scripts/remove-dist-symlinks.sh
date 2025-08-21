#!/usr/bin/env bash
set -euo pipefail

if [ -d frontend/dist ] && find frontend/dist -type l | grep . >/dev/null; then
  cp -aLR frontend/dist frontend/dist_real && rm -rf frontend/dist && mv frontend/dist_real frontend/dist
fi
