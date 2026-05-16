param(
    [string]$EnvFile = ".env",
    [string]$ApiDomain = $env:API_DOMAIN,
    [string]$AdminDomain = $env:ADMIN_DOMAIN,
    [string]$LogsDomain = $env:LOGS_DOMAIN,
    [string]$MobileApiBaseUrl = $env:EXPO_PUBLIC_API_BASE_URL
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$envPath = if ([System.IO.Path]::IsPathRooted($EnvFile)) { $EnvFile } else { Join-Path $root $EnvFile }

function Import-EnvFile {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return
    }

    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
            return
        }

        $key, $value = $line.Split("=", 2)
        $key = $key.Trim()
        $value = $value.Trim().Trim('"').Trim("'")
        if ($key -and -not [Environment]::GetEnvironmentVariable($key, "Process")) {
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

Import-EnvFile -Path $envPath

if (-not $ApiDomain) {
    $ApiDomain = $env:API_DOMAIN
}
if (-not $AdminDomain) {
    $AdminDomain = $env:ADMIN_DOMAIN
}
if (-not $LogsDomain) {
    $LogsDomain = $env:LOGS_DOMAIN
}
if (-not $MobileApiBaseUrl) {
    $MobileApiBaseUrl = $env:EXPO_PUBLIC_API_BASE_URL
}

function Assert-Status {
    param(
        [string]$Name,
        [string]$Url,
        [int[]]$ExpectedStatuses,
        [hashtable]$Headers = @{}
    )

    $curlArgs = @("-s", "-o", "NUL", "-w", "%{http_code}", $Url)
    foreach ($header in $Headers.GetEnumerator()) {
        $curlArgs = @("-H", "$($header.Key): $($header.Value)") + $curlArgs
    }

    $statusText = & curl.exe @curlArgs
    if ($LASTEXITCODE -ne 0) {
        throw "$Name check failed for $Url."
    }
    $status = [int]$statusText.Trim()

    if ($ExpectedStatuses -notcontains $status) {
        throw "$Name check failed for $Url. Expected [$($ExpectedStatuses -join ', ')], got $status."
    }

    Write-Host "$Name OK ($status): $Url"
}

if (-not $ApiDomain) { throw "API_DOMAIN is required." }
if (-not $AdminDomain) { throw "ADMIN_DOMAIN is required." }
if (-not $LogsDomain) { throw "LOGS_DOMAIN is required." }
if (-not $MobileApiBaseUrl) { throw "EXPO_PUBLIC_API_BASE_URL is required." }

Assert-Status -Name "API health" -Url "https://$ApiDomain/api/v1/health/" -ExpectedStatuses @(200)
Assert-Status -Name "Admin" -Url "https://$AdminDomain/" -ExpectedStatuses @(200)
Assert-Status -Name "Dozzle protection" -Url "https://$LogsDomain/" -ExpectedStatuses @(401, 403)

$expectedMobileUrl = "https://$ApiDomain/api/v1"
if ($MobileApiBaseUrl.TrimEnd("/") -ne $expectedMobileUrl) {
    throw "Mobile API URL mismatch. Expected EXPO_PUBLIC_API_BASE_URL=$expectedMobileUrl, got $MobileApiBaseUrl."
}
Write-Host "Mobile API URL OK: $MobileApiBaseUrl"

Write-Host "Production domain verification passed."
