param(
    [switch]$WithMobile
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

$dockerDesktop = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
if (Test-Path $dockerDesktop) {
    $dockerReady = $false
    try {
        docker version | Out-Null
        $dockerReady = $true
    } catch {
        $dockerReady = $false
    }

    if (-not $dockerReady) {
        Start-Process -FilePath $dockerDesktop -WindowStyle Hidden
        Write-Host "Starting Docker Desktop..."
        for ($i = 0; $i -lt 30; $i++) {
            Start-Sleep -Seconds 3
            try {
                docker version | Out-Null
                $dockerReady = $true
                break
            } catch {
                Write-Host "Waiting for Docker..."
            }
        }
    }
}

$services = @("postgres", "redis", "backend", "admin_panel")
if ($WithMobile) {
    $services += "mobile_app"
}

docker compose -f docker-compose.dev.yml up -d $services

for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 2
    try {
        $health = Invoke-WebRequest -UseBasicParsing "http://localhost:8000/api/v1/health/"
        if ($health.StatusCode -eq 200) {
            docker compose -f docker-compose.dev.yml exec -T backend python manage.py migrate --noinput
            if ($LASTEXITCODE -ne 0) {
                throw "Database migrations failed. Run: docker compose -f docker-compose.dev.yml logs backend"
            }

            docker compose -f docker-compose.dev.yml exec -T -e "ADMIN_EMAIL=riahwakil@gmail.com" -e "ADMIN_PASSWORD=NutriGuide!2026-Riah" -e "ADMIN_NAME=Riah Wakil" backend python manage.py ensure_superuser
            if ($LASTEXITCODE -ne 0) {
                throw "Local admin account setup failed. Run: docker compose -f docker-compose.dev.yml logs backend"
            }

            Write-Host "Backend healthy: http://localhost:8000"
            Write-Host "Admin panel: http://localhost:5173"
            if ($WithMobile) {
                Write-Host "Expo app: http://localhost:8081"
                Write-Host "Expo logs: docker compose -f docker-compose.dev.yml logs -f mobile_app"
            }
            exit 0
        }
    } catch {
        Write-Host "Waiting for backend..."
    }
}

throw "Backend did not become healthy. Run: docker compose -f docker-compose.dev.yml logs backend"
