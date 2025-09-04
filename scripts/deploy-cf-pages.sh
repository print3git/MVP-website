#!/bin/sh
set -e

if [ ! -f index.html ] || [ ! -f models/boombox.glb ]; then
  echo "Missing site files; skipping Cloudflare Pages deployment."
  exit 0
fi

if [ -z "$CF_PAGES_API_TOKEN" ] || [ -z "$CF_ACCOUNT_ID" ] || [ -z "$CF_PAGES_PROJECT" ]; then
  echo "CF_PAGES_API_TOKEN, CF_ACCOUNT_ID, and CF_PAGES_PROJECT must be set" >&2
  exit 1
fi

npx wrangler pages deploy . --project-name "$CF_PAGES_PROJECT"

