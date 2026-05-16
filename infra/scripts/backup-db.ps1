param(
    [string]$OutputDir = "backups"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$envFile = Join-Path $root ".env"
$composeFile = Join-Path $root "docker-compose.prod.yml"
$backupDir = Join-Path $root $OutputDir
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $backupDir "inutriguide-$timestamp.sql"

docker compose --env-file $envFile -f $composeFile exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > $backupPath

Write-Host "Database backup written to $backupPath"
