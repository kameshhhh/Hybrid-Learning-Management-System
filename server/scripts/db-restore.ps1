# ============================================================
# DATABASE RESTORE SCRIPT (PostgreSQL)
# ============================================================

$BackupDir = "backups"
$LogFile = "$BackupDir/restore_log.txt"

function Write-Log($Message) {
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$Timestamp - $Message" | Out-File -FilePath $LogFile -Append
    Write-Host "$Timestamp - $Message"
}

Write-Log "--- Starting Database Restore ---"

# 1. Check for backups
if (-not (Test-Path $BackupDir)) {
    Write-Log "Error: No backups directory found."
    exit 1
}

$Files = Get-ChildItem "$BackupDir/backup_*.sql" | Sort-Object LastWriteTime -Descending
if ($Files.Count -eq 0) {
    Write-Log "Error: No .sql backup files found in $BackupDir."
    exit 1
}

# 2. Select file
Write-Host "`nList of available backups:"
for ($i = 0; $i -lt $Files.Count; $i++) {
    Write-Host "$($i + 1). $($Files[$i].Name) ($($Files[$i].LastWriteTime))"
}

$Choice = Read-Host "`nEnter the number of the backup to restore (or 'q' to quit)"
if ($Choice -eq 'q') { exit 0 }

$Index = [int]$Choice - 1
if ($Index -lt 0 -or $Index -ge $Files.Count) {
    Write-Log "Error: Invalid selection."
    exit 1
}

$SelectedFile = $Files[$Index].FullName

# 3. SAFETY PROMPT
Write-Warning "`n************************************************************"
Write-Warning "CAUTION: THIS WILL OVERWRITE THE CURRENT DATABASE."
Write-Warning "DATABASE: hlms_db (from .env)"
Write-Warning "TARGET: $($Files[$Index].Name)"
Write-Warning "************************************************************"
$Confirm = Read-Host "`nAre you sure you want to continue? Type 'yes' to proceed"
if ($Confirm -ne "yes") {
    Write-Log "Restore aborted by user."
    exit 0
}

# 4. Load .env and extract DATABASE_URL
if (-not (Test-Path ".env")) {
    Write-Log "Error: .env file not found."
    exit 1
}

$DBUrlLine = (Get-Content ".env") | Where-Object { $_ -match "^DATABASE_URL=" }
$DBUrl = $DBUrlLine -replace '^DATABASE_URL="?([^"]+)"?.*$', '$1'

# 5. Check for psql
$PsqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $PsqlPath) {
    # Fallback
    $CommonPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
    if (Test-Path $CommonPath) {
        $env:Path += ";C:\Program Files\PostgreSQL\18\bin"
    } else {
        Write-Log "Error: psql not found."
        exit 1
    }
}

# 6. Execute Restore
Write-Log "Executing psql from $SelectedFile..."
try {
    # Drop and create the database or just use psql to restore? 
    # Usually psql < backup.sql is enough if the backup was full.
    # Note: If there are active connections, psql might fail.
    
    psql -d "$DBUrl" -f "$SelectedFile" 2>&1 | Out-String | ForEach-Object { Write-Log $_ }
    Write-Log "Success: Restore completed from $($Files[$Index].Name)."
}
catch {
    Write-Log "Error: psql failed: $_"
    exit 1
}

Write-Log "--- Restore Process Completed ---"
