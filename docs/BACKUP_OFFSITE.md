# Offsite Backup Strategy

## Recommended Options

### Option A: Cloudflare R2 (Cheapest, S3-compatible)
1. Create R2 bucket at dash.cloudflare.com
2. Install rclone: `sudo apt install rclone`
3. Configure: `rclone config`
4. Add to `scripts/backup.sh` after local backup:
   ```bash
   rclone copy "$BACKUP_DIR" r2:porjar-backups/daily/ --min-age 1h
   ```

### Option B: Backblaze B2 ($0.005/GB/month)
Same as R2, different provider.

### Option C: Encrypted rsync to second VPS
```bash
rsync -avz --delete "$BACKUP_DIR/" user@backup-vps:/backups/porjar/
```

## RPO/RTO Targets
- Local backup: Daily 2 AM -> RPO 24h
- Offsite backup: Within 1h of local -> RPO 25h
- Restore time: Documented in BACKUP.md

## Encryption
Backups contain PII. Enable at-rest encryption:
```bash
gpg --encrypt -r backups@esidenpasar.com "$DUMP_FILE"
```
