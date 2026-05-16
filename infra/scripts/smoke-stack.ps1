$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$compose = @(
    "-p", "inutriguide_smoke",
    "-f", (Join-Path $root "docker-compose.dev.yml"),
    "-f", (Join-Path $root "docker-compose.smoke.yml")
)

try {
    docker compose @compose up -d --build
    docker compose @compose exec -T backend python manage.py migrate
    docker compose @compose exec -T backend python manage.py seed_demo

    Invoke-RestMethod -Uri "http://localhost:18000/api/v1/health/" | ConvertTo-Json
    Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:15173" -TimeoutSec 10 | Select-Object StatusCode
    Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:19999" -TimeoutSec 10 | Select-Object StatusCode
}
finally {
    docker compose @compose down -v
}
