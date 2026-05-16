$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$envFile = Join-Path $root ".env"
$composeFile = Join-Path $root "docker-compose.prod.yml"

if (-not (Test-Path $envFile)) {
    throw "Missing .env. Copy .env.production.example to .env and fill production secrets first."
}

docker compose --env-file $envFile -f $composeFile pull
docker compose --env-file $envFile -f $composeFile up -d --build
powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "post-deploy.ps1")

Write-Host "Deployment completed. Check health at https://$env:API_DOMAIN/api/v1/health/"
