#!/bin/bash
set -e
BACKUP_DIR="${BACKUP_DIR:-/home/oman/backups/porjar}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

DUMP_FILE="$BACKUP_DIR/db_$TIMESTAMP.sql.gz"
UPLOAD_FILE="$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz"

# Database dump
docker compose -f /home/oman/project/porjar/docker-compose.prod.yml --env-file /home/oman/project/porjar/.env.prod exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip > "$DUMP_FILE"

# Uploads volume
docker run --rm -v porjar_uploads_data:/data -v "$BACKUP_DIR":/backup alpine \
  tar czf "/backup/uploads_$TIMESTAMP.tar.gz" -C /data . || true

# Generate checksums next to each backup (best-effort for uploads)
( cd "$BACKUP_DIR" && sha256sum "$(basename "$DUMP_FILE")" > "$(basename "$DUMP_FILE").sha256" )
if [ -f "$UPLOAD_FILE" ]; then
  ( cd "$BACKUP_DIR" && sha256sum "$(basename "$UPLOAD_FILE")" > "$(basename "$UPLOAD_FILE").sha256" ) || true
fi

# Log size + checksum of each backup
DB_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
DB_SHA=$(cut -d' ' -f1 < "$DUMP_FILE.sha256")
echo "[$TIMESTAMP] DB backup: ${DB_SIZE}, sha256: ${DB_SHA}" >> "$BACKUP_DIR/backup.log"
if [ -f "$UPLOAD_FILE" ] && [ -f "$UPLOAD_FILE.sha256" ]; then
  UP_SIZE=$(du -h "$UPLOAD_FILE" | cut -f1)
  UP_SHA=$(cut -d' ' -f1 < "$UPLOAD_FILE.sha256")
  echo "[$TIMESTAMP] Uploads backup: ${UP_SIZE}, sha256: ${UP_SHA}" >> "$BACKUP_DIR/backup.log"
fi

# Rotation: keep last 14 days (includes .sha256 sidecars)
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +14 -delete
find "$BACKUP_DIR" -name "db_*.sql.gz.sha256" -mtime +14 -delete
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +14 -delete
find "$BACKUP_DIR" -name "uploads_*.tar.gz.sha256" -mtime +14 -delete

echo "Backup $TIMESTAMP complete"
ls -lh "$BACKUP_DIR" | tail -10
