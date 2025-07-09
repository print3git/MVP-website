#!/usr/bin/env bash
set -e

# Ensure required variables are set
for var in CF_PAGES_API_TOKEN CF_ACCOUNT_ID CF_PAGES_PROJECT; do
  if [[ -z "${!var}" ]]; then
    echo "Error: $var is not set."
    exit 1
  fi
done

auth_header="Authorization: Bearer $CF_PAGES_API_TOKEN"
base_url="https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/pages/projects"

# 1. List all Pages projects
echo "Listing all Pages projects..."
list_resp=$(curl -sSL -H "$auth_header" "$base_url")
echo "$list_resp" | jq

if [[ "$(echo "$list_resp" | jq -r '.success')" == "true" ]]; then
  echo "✓ Listing projects succeeded"
else
  echo "✗ Listing projects failed:"
  echo "$list_resp" | jq '.errors'
  exit 1
fi

# 2. Fetch details for the specific project
echo "Fetching project details..."
project_resp=$(curl -sSL -H "$auth_header" "$base_url/$CF_PAGES_PROJECT")
echo "$project_resp" | jq

if [[ "$(echo "$project_resp" | jq -r '.success')" == "true" ]]; then
  echo "✓ Project details succeeded"
else
  echo "✗ Project details failed:"
  echo "$project_resp" | jq '.errors'
  exit 1
fi

echo "All checks passed—your token/account/project are valid."
