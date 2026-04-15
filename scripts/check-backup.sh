#!/bin/bash
# Check if backup was created in last 26 hours.
# Sends an alert to $ALERT_WEBHOOK (Discord/Telegram/Slack compatible POST) if
# no recent backup is found. Safe to run from cron.
BACKUP_DIR="${BACKUP_DIR:-/home/oman/backups/porjar}"
LATEST=$(ls -t "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | head -1)

if [ -z "$LATEST" ]; then
    # Send alert (customize webhook URL)
    curl -s -X POST "${ALERT_WEBHOOK}" -d "ALERT: No backup found at $(hostname)" 2>/dev/null || true
    exit 1
fi

AGE_HOURS=$(( ($(date +%s) - $(stat -c %Y "$LATEST")) / 3600 ))
if [ $AGE_HOURS -gt 26 ]; then
    curl -s -X POST "${ALERT_WEBHOOK}" -d "ALERT: Backup stale (${AGE_HOURS}h) at $(hostname)" 2>/dev/null || true
    exit 1
fi
echo "OK: Latest backup ${AGE_HOURS}h ago"
