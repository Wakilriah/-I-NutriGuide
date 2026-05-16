$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$project = "inutriguide_routes"
$composeFiles = @(
    "-f", "docker-compose.prod.yml",
    "-f", "docker-compose.routes-smoke.yml"
)

$env:API_DOMAIN = "api.localhost"
$env:ADMIN_DOMAIN = "admin.localhost"
$env:LOGS_DOMAIN = "logs.localhost"
$env:VITE_API_BASE_URL = "http://api.localhost:18080/api/v1"
$env:DOZZLE_BASIC_AUTH = 'admin:$$apr1$$replace$$with-real-htpasswd-hash'

function Invoke-Compose {
    param([string[]] $ComposeArgs)
    & docker compose -p $project @composeFiles @ComposeArgs
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose failed: $($ComposeArgs -join ' ')"
    }
}

function Get-StatusCode {
    param(
        [string] $Url,
        [string] $HostHeader
    )

    $status = & curl.exe -s -o NUL -w "%{http_code}" -H "Host: $HostHeader" $Url
    if ($LASTEXITCODE -ne 0) {
        return "000"
    }
    return $status.Trim()
}

function Wait-ForStatus {
    param(
        [string] $Name,
        [string] $Url,
        [string] $HostHeader,
        [string[]] $ExpectedStatuses
    )

    for ($attempt = 1; $attempt -le 40; $attempt++) {
        $status = Get-StatusCode -Url $Url -HostHeader $HostHeader
        if ($ExpectedStatuses -contains $status) {
            Write-Host "$Name route OK ($status)"
            return
        }
        if (($attempt % 10) -eq 0) {
            Write-Host "$Name route waiting; latest status was $status"
        }
        Start-Sleep -Seconds 3
    }

    throw "$Name route did not return one of [$($ExpectedStatuses -join ', ')]"
}

Push-Location $root
try {
    Invoke-Compose -ComposeArgs @("up", "-d", "--build")

    Wait-ForStatus -Name "API" -Url "http://localhost:18080/api/v1/health/" -HostHeader "api.localhost" -ExpectedStatuses @("200")
    Wait-ForStatus -Name "Admin" -Url "http://localhost:18080/" -HostHeader "admin.localhost" -ExpectedStatuses @("200")
    Wait-ForStatus -Name "Dozzle" -Url "http://localhost:18080/" -HostHeader "logs.localhost" -ExpectedStatuses @("401")

    Write-Host "Traefik route smoke test passed."
}
finally {
    Invoke-Compose -ComposeArgs @("down", "-v", "--remove-orphans")
    Pop-Location
}
