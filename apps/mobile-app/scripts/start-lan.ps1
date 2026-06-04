$ErrorActionPreference = "Stop"

$appRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $appRoot

$candidate = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
        $_.IPAddress -notlike "127.*" -and
        $_.IPAddress -notlike "169.254.*" -and
        $_.InterfaceAlias -notmatch "WSL|Hyper-V|Docker|Loopback|vEthernet"
    } |
    Sort-Object @{
        Expression = {
            if ($_.InterfaceAlias -match "Wi-Fi|Wireless|WLAN") { 0 }
            elseif ($_.InterfaceAlias -match "Ethernet") { 1 }
            else { 2 }
        }
    }, InterfaceAlias |
    Select-Object -First 1

if (-not $candidate) {
    throw "Could not detect a LAN IPv4 address. Connect to Wi-Fi/Ethernet and try again."
}

$lanIp = $candidate.IPAddress
$apiBaseUrl = "http://${lanIp}:8000/api/v1"
$envLocalPath = Join-Path $appRoot ".env.local"

Set-Content -Path $envLocalPath -Value @(
    "EXPO_PUBLIC_API_BASE_URL=$apiBaseUrl"
    "REACT_NATIVE_PACKAGER_HOSTNAME=$lanIp"
)

$env:EXPO_PUBLIC_API_BASE_URL = $apiBaseUrl
$env:REACT_NATIVE_PACKAGER_HOSTNAME = $lanIp

Write-Host "LAN IP: $lanIp"
Write-Host "API URL: $apiBaseUrl"
Write-Host "Updated: $envLocalPath"

npx expo start --host lan --port 8081
