#!/usr/bin/env bash
set -euo pipefail
git config --global pull.rebase true
git config --global rebase.autoStash true
git config --global fetch.prune true
git config --global alias.up "!git fetch origin -p && git rebase origin/\$(git rev-parse --abbrev-ref HEAD)"
echo "Configured global git settings. You can now run 'git up' on any branch."
