param(
    [string]$EnvFile = ".env",
    [string]$ExpectedIp = $env:VPS_IP
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
        if (-not [Environment]::GetEnvironmentVariable($key.Trim(), "Process")) {
            [Environment]::SetEnvironmentVariable($key.Trim(), $value.Trim().Trim('"').Trim("'"), "Process")
        }
    }
}

function Resolve-DomainIps {
    param([string]$Domain)

    try {
        return @(Resolve-DnsName -Name $Domain -Type A -ErrorAction Stop | Where-Object { $_.IPAddress } | Select-Object -ExpandProperty IPAddress)
    }
    catch {
        $nslookupOutput = & nslookup $Domain 2>$null
        return @($nslookupOutput | Select-String -Pattern "Address:\s+([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)" | ForEach-Object { $_.Matches[0].Groups[1].Value } | Select-Object -Skip 1)
    }
}

Import-EnvFile -Path $envPath

$domains = @($env:API_DOMAIN, $env:ADMIN_DOMAIN, $env:LOGS_DOMAIN) | Where-Object { $_ }
if ($domains.Count -ne 3) {
    throw "API_DOMAIN, ADMIN_DOMAIN, and LOGS_DOMAIN are required. Provide them in $EnvFile or environment variables."
}

foreach ($domain in $domains) {
    $ips = Resolve-DomainIps -Domain $domain
    if (-not $ips -or $ips.Count -eq 0) {
        throw "$domain does not resolve to an A record."
    }

    if ($ExpectedIp -and ($ips -notcontains $ExpectedIp)) {
        throw "$domain resolves to [$($ips -join ', ')], expected $ExpectedIp."
    }

    Write-Host "$domain DNS OK: $($ips -join ', ')"
}

Write-Host "DNS preflight passed."
