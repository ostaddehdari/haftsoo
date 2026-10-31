#!/usr/bin/env bash
set -euo pipefail

: "${HAFTSOO_DATABASE_URL_FILE:?set HAFTSOO_DATABASE_URL_FILE}"
backup_directory="${HAFTSOO_BACKUP_DIR:-ops/backups/postgres}"
retention_days="${HAFTSOO_BACKUP_RETENTION_DAYS:-7}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="$backup_directory/haftsoo-$timestamp.dump"

install -d -m 0750 "$backup_directory"
database_url="$(<"$HAFTSOO_DATABASE_URL_FILE")"
pg_dump --dbname="$database_url" --format=custom --file="$target"
sha256sum "$target" >"$target.sha256"
chmod 0640 "$target" "$target.sha256"
find "$backup_directory" -type f -mtime "+$retention_days" -name 'haftsoo-*.dump*' -delete
echo "backup written: $target"
