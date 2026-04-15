# Backup and Restore

Automated daily backups of the PORJAR PostgreSQL database and uploads volume.

## Scripts

- `scripts/backup.sh` — Dumps DB (gzip) and uploads volume (tar.gz) to `$BACKUP_DIR` (default `/home/oman/backups/porjar`). Rotates files older than 14 days.
- `scripts/restore.sh <db_TIMESTAMP.sql.gz>` — Restores a DB dump into the running postgres container. **Destructive.**

## Run manually

```bash
/home/oman/project/porjar/scripts/backup.sh
```

## Crontab setup

Install daily 2 AM backup:

```bash
crontab -e
```

Add:

```
# Daily backup at 2 AM
0 2 * * * /home/oman/project/porjar/scripts/backup.sh >> /home/oman/backups/porjar/backup.log 2>&1
```

## Restore

```bash
/home/oman/project/porjar/scripts/restore.sh /home/oman/backups/porjar/db_20260408_020000.sql.gz
```

To restore uploads:

```bash
docker run --rm -v porjar_uploads_data:/data -v /home/oman/backups/porjar:/backup alpine \
  sh -c "cd /data && tar xzf /backup/uploads_TIMESTAMP.tar.gz"
```

## Verifying Backup

```bash
./scripts/verify-backup.sh
```

Checks the latest DB backup's SHA-256 checksum, gzip integrity, SQL header, and age.

## Monitoring

Add to crontab to alert on missing/stale backups (configure `ALERT_WEBHOOK` env):

```
0 */6 * * * /home/oman/project/porjar/scripts/check-backup.sh >> /home/oman/backups/porjar/monitor.log 2>&1
```

## Off-site backups

Consider syncing `/home/oman/backups/porjar` to remote storage (rsync, restic, rclone) on a weekly cron. See [BACKUP_OFFSITE.md](./BACKUP_OFFSITE.md) for recommended providers (Cloudflare R2, Backblaze B2, or rsync to a second VPS) and RPO/RTO targets.
