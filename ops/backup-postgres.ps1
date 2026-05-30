param(
  [string]$ComposeFile = "docker-compose.yml",
  [string]$Service = "postgres",
  [string]$Database = $env:POSTGRES_DB,
  [string]$User = $env:POSTGRES_USER,
  [string]$OutputDir = "backups"
)

if (-not $Database) { $Database = "cartagena_db" }
if (-not $User) { $User = "cartagena_user" }

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$fileName = "$Database-$timestamp.dump"
$containerPath = "/backups/$fileName"
$hostPath = Join-Path $OutputDir $fileName

docker compose -f $ComposeFile exec -T $Service pg_dump -U $User -d $Database -Fc -f $containerPath

if (-not (Test-Path $hostPath)) {
  throw "Backup was not created at $hostPath"
}

Write-Host "Backup created: $hostPath"
