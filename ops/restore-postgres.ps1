param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,
  [string]$ComposeFile = "docker-compose.yml",
  [string]$Service = "postgres",
  [string]$Database = $env:POSTGRES_DB,
  [string]$User = $env:POSTGRES_USER
)

if (-not $Database) { $Database = "cartagena_db" }
if (-not $User) { $User = "cartagena_user" }

if (-not (Test-Path $BackupFile)) {
  throw "Backup file not found: $BackupFile"
}

$fileName = Split-Path $BackupFile -Leaf
$containerPath = "/backups/$fileName"
New-Item -ItemType Directory -Force -Path "backups" | Out-Null
$sourcePath = (Resolve-Path $BackupFile).Path
$targetPath = Join-Path (Resolve-Path "backups").Path $fileName

if ($sourcePath -ne $targetPath) {
  Copy-Item -Path $BackupFile -Destination $targetPath -Force
}

docker compose -f $ComposeFile exec -T $Service pg_restore -U $User -d $Database --clean --if-exists --no-owner $containerPath

Write-Host "Restore completed from: $BackupFile"
