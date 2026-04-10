# ============================================================
# DATABASE BACKUP SCRIPT (PostgreSQL)
# ============================================================

$BackupDir = "backups"
$LogFile = "$BackupDir/backup_log.txt"
$MaxBackups = 5

# Ensure backup directory exists
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

function Write-Log($Message) {
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$Timestamp - $Message" | Out-File -FilePath $LogFile -Append
    Write-Host "$Timestamp - $Message"
}

Write-Log "--- Starting Database Backup ---"

# 1. Load .env and extract DATABASE_URL
if (-not (Test-Path ".env")) {
    Write-Log "Error: .env file not found in current directory."
    exit 1
}

$EnvFile = Get-Content ".env"
$DBUrlLine = $EnvFile | Where-Object { $_ -match "^DATABASE_URL=" }
if (-not $DBUrlLine) {
    Write-Log "Error: DATABASE_URL not found in .env"
    exit 1
}

$DBUrl = $DBUrlLine -replace '^DATABASE_URL="?([^"]+)"?.*$', '$1'

# 2. Safety Check: Verify Environment
if ($DBUrl -match "@localhost" -or $DBUrl -match "@127.0.0.1") {
    Write-Log "Environment: Localhost detected. Proceeding..."
}
else {
    Write-Warning "CAUTION: Target database appears to be REMOTE ($DBUrl)."
    $Confirm = Read-Host "Are you sure you want to backup this environment? (yes/no)"
    if ($Confirm -ne "yes") {
        Write-Log "Backup aborted by user."
        exit 0
    }
}

# 3. Check for pg_dump
$PgDumpPath = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $PgDumpPath) {
    # Fallback to common installation path
    $CommonPath = "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
    if (Test-Path $CommonPath) {
        $PgDumpPath = $CommonPath
        # Temporarily add to path for execution
        $env:Path += ";C:\Program Files\PostgreSQL\18\bin"
    } else {
        Write-Log "Error: pg_dump not found in PATH or standard location ($CommonPath). Review installation."
        exit 1
    }
}

# 4. Perform Backup
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "$BackupDir/backup_$Timestamp.sql"

Write-Log "Executing pg_dump to $BackupFile..."

try {
    # We use the connection string directly
    pg_dump -d "$DBUrl" -f "$BackupFile" 2>&1 | Out-String | ForEach-Object { Write-Log $_ }
    
    if (Test-Path $BackupFile) {
        $FileSize = (Get-Item $BackupFile).Length
        if ($FileSize -gt 100) {
            Write-Log "Success: Backup created ($FileSize bytes)."
        } else {
            Write-Log "Warning: Backup file is suspiciously small ($FileSize bytes). Check logs."
        }
    } else {
        Write-Log "Error: Backup file was NOT created."
        exit 1
    }
}
catch {
    Write-Log "Error: pg_dump failed: $_"
    exit 1
}

# 5. Retention: Keep only the 5 most recent backups
Write-Log "Cleaning up old backups (Keeping last $MaxBackups)..."
$OldFiles = Get-ChildItem "$BackupDir/backup_*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -Skip $MaxBackups
foreach ($File in $OldFiles) {
    Write-Log "Deleting old backup: $($File.Name)"
    Remove-Item $File.FullName
}

Write-Log "--- Backup Process Completed ---"
