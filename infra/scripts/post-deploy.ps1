$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$envFile = Join-Path $root ".env"
$composeFile = Join-Path $root "docker-compose.prod.yml"

if (-not (Test-Path $envFile)) {
    throw "Missing .env. Copy .env.production.example to .env and fill production secrets first."
}

$env:ENV_FILE = ".env"
docker compose --env-file $envFile -f $composeFile exec backend python manage.py migrate
docker compose --env-file $envFile -f $composeFile exec backend python manage.py seed_all
docker compose --env-file $envFile -f $composeFile exec backend python manage.py ensure_superuser
docker compose --env-file $envFile -f $composeFile exec backend python manage.py collectstatic --noinput

Write-Host "Post-deploy tasks completed: migrations, seed data, superuser, collectstatic."
