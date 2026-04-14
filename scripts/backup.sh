#!/bin/bash
set -e
BACKUP_DIR="${BACKUP_DIR:-/home/oman/backups/porjar}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# Database dump
docker compose -f /home/oman/project/porjar/docker-compose.prod.yml --env-file /home/oman/project/porjar/.env.prod exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# Uploads volume
docker run --rm -v porjar_uploads_data:/data -v "$BACKUP_DIR":/backup alpine \
  tar czf "/backup/uploads_$TIMESTAMP.tar.gz" -C /data . || true

# Rotation: keep last 14 days
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +14 -delete
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +14 -delete

echo "Backup $TIMESTAMP complete"
ls -lh "$BACKUP_DIR" | tail -10
