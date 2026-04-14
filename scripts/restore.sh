#!/bin/bash
set -e
BACKUP_FILE="$1"
if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: restore.sh <db_TIMESTAMP.sql.gz>"
  ls /home/oman/backups/porjar/db_*.sql.gz 2>/dev/null | tail -5
  exit 1
fi

echo "WARNING: This will REPLACE the database. Ctrl+C to cancel."
sleep 5

gunzip -c "$BACKUP_FILE" | docker compose -f /home/oman/project/porjar/docker-compose.prod.yml --env-file /home/oman/project/porjar/.env.prod exec -T postgres \
  sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'

echo "Restored from $BACKUP_FILE"
