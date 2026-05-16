param(
    [Parameter(Mandatory = $true)]
    [string]$HostName,
    [string]$User = "root",
    [string]$RemotePath = "/opt/inutriguide",
    [string]$EnvFile = ".env",
    [string]$KeyFile = "",
    [switch]$SkipEnvUpload
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$envPath = if ([System.IO.Path]::IsPathRooted($EnvFile)) { $EnvFile } else { Join-Path $root $EnvFile }
$target = "$User@$HostName"
$sshArgs = @()

if ($KeyFile) {
    $sshArgs += @("-i", $KeyFile)
}

if (-not $SkipEnvUpload) {
    if (-not (Test-Path $envPath)) {
        throw "Missing $EnvFile. Copy .env.production.example to .env and fill production values first."
    }
    & scp @sshArgs $envPath "${target}:${RemotePath}/.env"
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to upload .env to $target."
    }
}

$remoteCommand = @"
set -eu
cd "$RemotePath"
git pull --ff-only
chmod +x infra/scripts/*.sh
infra/scripts/validate-production-env.sh
docker compose --env-file .env -f docker-compose.prod.yml config --quiet
infra/scripts/deploy.sh
infra/scripts/verify-production.sh
"@

& ssh @sshArgs $target $remoteCommand
if ($LASTEXITCODE -ne 0) {
    throw "Remote deployment failed on $target."
}

Write-Host "Remote deployment completed on $target."
