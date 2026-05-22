param(
    [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$envPath = if ([System.IO.Path]::IsPathRooted($EnvFile)) { $EnvFile } else { Join-Path $root $EnvFile }

if (-not (Test-Path $envPath)) {
    throw "Missing $EnvFile. Copy .env.production.example to .env and fill production values first."
}

$values = @{}
Get-Content $envPath | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
        return
    }
    $key, $value = $line.Split("=", 2)
    $values[$key.Trim()] = $value.Trim().Trim('"').Trim("'")
}

$required = @(
    "POSTGRES_DB",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "REDIS_URL",
    "DJANGO_SECRET_KEY",
    "DJANGO_SECURE_SSL_REDIRECT",
    "DJANGO_SECURE_HSTS_SECONDS",
    "DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS",
    "DJANGO_SECURE_HSTS_PRELOAD",
    "DJANGO_ALLOWED_HOSTS",
    "CORS_ALLOWED_ORIGINS",
    "CSRF_TRUSTED_ORIGINS",
    "API_HOST",
    "ADMIN_HOST",
    "DOZZLE_HOST",
    "NEO4J_HOST",
    "VITE_API_BASE_URL",
    "EXPO_PUBLIC_API_BASE_URL",
    "TRAEFIK_ACME_EMAIL",
    "DOCKER_IMAGE_NAMESPACE",
    "IMAGE_TAG",
    "ADMIN_EMAIL",
    "ADMIN_NAME",
    "ADMIN_PASSWORD",
    "DOZZLE_BASIC_AUTH"
)

foreach ($key in $required) {
    if (-not $values.ContainsKey($key) -or -not $values[$key]) {
        throw "$key is required in $EnvFile."
    }
}

$placeholderPatterns = @("yourdomain.com", "replace_with", "with-real", "your-password")
foreach ($key in $required) {
    foreach ($pattern in $placeholderPatterns) {
        if ($values[$key] -like "*$pattern*") {
            throw "$key still contains placeholder value '$pattern'."
        }
    }
}

if ($values["DJANGO_DEBUG"] -ne "False") {
    throw "DJANGO_DEBUG must be False in production."
}
if ($values["VITE_API_BASE_URL"] -like "https://*") {
    $expectedScheme = "https"
    if ($values["DJANGO_SECURE_SSL_REDIRECT"] -ne "True") {
        throw "DJANGO_SECURE_SSL_REDIRECT must be True when using HTTPS."
    }
    if ([int]$values["DJANGO_SECURE_HSTS_SECONDS"] -lt 31536000) {
        throw "DJANGO_SECURE_HSTS_SECONDS must be at least 31536000 when using HTTPS."
    }
    if ($values["DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS"] -ne "True") {
        throw "DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS must be True when using HTTPS."
    }
} elseif ($values["VITE_API_BASE_URL"] -like "http://*") {
    $expectedScheme = "http"
    if ($values["DJANGO_SECURE_SSL_REDIRECT"] -ne "False") {
        throw "DJANGO_SECURE_SSL_REDIRECT must be False when serving by bare IP over HTTP."
    }
} else {
    throw "VITE_API_BASE_URL must start with http:// or https://."
}
if ($values["DJANGO_SECRET_KEY"].Length -lt 50 -or (($values["DJANGO_SECRET_KEY"].ToCharArray() | Select-Object -Unique).Count -lt 20)) {
    throw "DJANGO_SECRET_KEY must be at least 50 characters with high entropy."
}

if ($values["TRAEFIK_ACME_EMAIL"] -notmatch "^[^@\s]+@[^@\s]+\.[^@\s]+$") {
    throw "TRAEFIK_ACME_EMAIL must be a valid email address for Let's Encrypt notices."
}

$expectedApiBase = "$expectedScheme://$($values["API_HOST"])/api/v1"
if ($values["VITE_API_BASE_URL"].TrimEnd("/") -ne $expectedApiBase) {
    throw "VITE_API_BASE_URL must be $expectedApiBase."
}
if ($values["EXPO_PUBLIC_API_BASE_URL"].TrimEnd("/") -ne $expectedApiBase) {
    throw "EXPO_PUBLIC_API_BASE_URL must be $expectedApiBase."
}

if ($values["CORS_ALLOWED_ORIGINS"] -notlike "*$expectedScheme://$($values["ADMIN_HOST"])*") {
    throw "CORS_ALLOWED_ORIGINS must include $expectedScheme://$($values["ADMIN_HOST"])."
}
if ($values["CSRF_TRUSTED_ORIGINS"] -notlike "*$expectedScheme://$($values["API_HOST"])*" -or $values["CSRF_TRUSTED_ORIGINS"] -notlike "*$expectedScheme://$($values["ADMIN_HOST"])*") {
    throw "CSRF_TRUSTED_ORIGINS must include $expectedScheme://$($values["API_HOST"]) and $expectedScheme://$($values["ADMIN_HOST"])."
}

Write-Host "Production env validation passed: $EnvFile"
