# Database Management & Migration SOP

This document defines the strict operational rules for managing the **Skillcourse** PostgreSQL database to prevent data loss.

---

## 🛑 Migration Safety Rules

### Rule 1: Zero-Tolerance for Silent Destruction
NEVER run `npx prisma db push` or `npx prisma migrate dev` on a database targeting a production or staging environment without a prior backup.

### Rule 2: Safe Schemas
- Use `npx prisma migrate dev` **ONLY** in local development when you are prepared for a database reset.
- Use `npx prisma migrate deploy` for applying schema changes to databases containing existing data. This command is non-destructive (it only applies migrations in the migration history).

### Rule 3: Mandatory Pre-Migration Backup
Before running ANY command that modifies the schema (`migrate`, `generate`, `deploy`), you MUST execute the backup script.

---

## 💾 Backup & Restore Procedures

### Running Backups
The backup script extracts credentials from your `.env` and creates a compressed SQL dump.

```powershell
# From the /server directory
.\scripts\db-backup.ps1
```
- **Output**: `server/backups/backup_YYYYMMDD_HHMMSS.sql`
- **Retention**: Only the last **5** backups are kept.

### Running Restorations
The restore script will list available backups and prompt for human confirmation before overwriting the current database.

```powershell
# From the /server directory
.\scripts\db-restore.ps1
```
- **Caution**: This script overwrites the entire database. Use only when restoration is absolutely necessary and after verifying the selected file.

---

## 📈 Monitoring & Logging
- **Backup Logs**: Check `server/backups/backup_log.txt` for historical success/failure reports.
- **Diagnostics**: If you see the "⚠️ System data was reset" warning in the UI, it means a migration caused a reset. Use `db-restore.ps1` to recover the latest backup.

---

## 🛠️ Environment Safety
The scripts will check if the `DATABASE_URL` contains `localhost` or `127.0.0.1`. If a remote host is detected, a mandatory "Are you sure?" prompt will appear to prevent accidental manipulation of the production environment.
