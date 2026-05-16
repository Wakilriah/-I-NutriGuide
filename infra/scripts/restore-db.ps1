param(
    [Parameter(Mandatory = $true)]
    [string]$BackupPath
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$envFile = Join-Path $root ".env"
$composeFile = Join-Path $root "docker-compose.prod.yml"
$resolvedBackup = if ([System.IO.Path]::IsPathRooted($BackupPath)) { $BackupPath } else { Join-Path $root $BackupPath }

if (-not (Test-Path $envFile)) {
    throw "Missing .env. Copy .env.production.example to .env and fill production secrets first."
}

if (-not (Test-Path $resolvedBackup)) {
    throw "Backup file not found: $BackupPath"
}

Get-Content -Raw $resolvedBackup | docker compose --env-file $envFile -f $composeFile exec -T postgres sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'

Write-Host "Database restored from $resolvedBackup"
