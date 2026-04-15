#!/bin/bash
set -e
BACKUP_DIR="${BACKUP_DIR:-/home/oman/backups/porjar}"
LATEST=$(ls -t "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | head -1)

if [ -z "$LATEST" ]; then
    echo "ERROR: No backups found"
    exit 1
fi

echo "Verifying: $LATEST"

# Checksum verification
if [ -f "$LATEST.sha256" ]; then
    ( cd "$BACKUP_DIR" && sha256sum -c "$(basename "$LATEST").sha256" ) \
        || { echo "Checksum FAILED"; exit 1; }
    echo "Checksum OK"
fi

# Try to peek inside gzip
gunzip -t "$LATEST" && echo "Gzip integrity OK"

# Try parsing SQL (first 1000 lines)
gunzip -c "$LATEST" | head -1000 | grep -q "PostgreSQL database dump" && echo "SQL header OK"

# Check age
AGE_HOURS=$(( ($(date +%s) - $(stat -c %Y "$LATEST")) / 3600 ))
if [ $AGE_HOURS -gt 26 ]; then
    echo "WARNING: Latest backup is ${AGE_HOURS}h old"
fi

echo "Backup verification complete"
