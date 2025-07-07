# Database Backup and Restore

## Backup

Backups are created automatically each day by a GitHub Action that runs the
`scripts/backup-db.sh` script. Dumps are compressed and stored as workflow
artifacts for seven days.

## Restore

1. Download the desired `db-YYYY-MM-DD.sql.gz` artifact from the workflow run.
2. Decompress the file:
   ```bash
   gunzip db-YYYY-MM-DD.sql.gz
   ```
3. Restore to your database:
   ```bash
   psql "$DB_URL" < db-YYYY-MM-DD.sql
   ```
   Make sure `$DB_URL` points to the target database instance.
