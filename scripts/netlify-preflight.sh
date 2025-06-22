#!/bin/sh
if [ -z "$NETLIFY_AUTH_TOKEN" ] || [ -z "$NETLIFY_SITE_ID" ]; then
  echo "\u274c NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID must be set" >&2
  exit 1
fi
