$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$envFile = Join-Path $root ".env"
$composeFile = Join-Path $root "docker-compose.prod.yml"

if (-not (Test-Path $envFile)) {
    throw "Missing .env. Copy .env.production.example to .env and fill production secrets first."
}

$env:ENV_FILE = ".env"
docker compose --env-file $envFile -f $composeFile pull
docker compose --env-file $envFile -f $composeFile up -d
powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "post-deploy.ps1")

Write-Host "Deployment completed. Check health at http://$env:PUBLIC_HOST/api/v1/health/"
