#!/bin/bash
set -euo pipefail

date_str=$(date +%F)
backup_dir="$(dirname "$0")/../backups"
mkdir -p "$backup_dir"

if [ -z "${DB_URL:-}" ]; then
  echo "DB_URL is not set" >&2
  exit 1
fi

pg_dump "$DB_URL" | gzip > "$backup_dir/db-$date_str.sql.gz"

echo "Backup stored at $backup_dir/db-$date_str.sql.gz"
