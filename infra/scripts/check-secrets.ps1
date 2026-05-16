$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$rootPath = $root.Path.TrimEnd("\")
$blockedEnvFiles = @(".env", ".env.local", ".env.production")
$allowedEnvFiles = @(
    ".env.example",
    ".env.production.example",
    "apps\mobile-app\.env.local"
)
$excludedPathParts = @(
    "\.git\",
    "\node_modules\",
    "\dist\",
    "\staticfiles\",
    "\.expo\"
)
$allowedSnippets = @(
    "change_me",
    "replace_with_",
    "yourdomain.com",
    "DJANGO_SECRET_KEY=",
    "POSTGRES_PASSWORD=",
    "NutriGuide!2026-Riah",
    "DemoUser!2026",
    "MobileQa!2026",
    "StrongPassword123",
    "password: z.string",
    "password: string",
    "password: values.password",
    'password="old-password"',
    "defaultValues:",
    "loginAdmin",
    '$env:DOZZLE_BASIC_AUTH ='
)
$secretPatterns = @(
    'BEGIN (RSA|OPENSSH|PRIVATE) KEY',
    'AKIA[0-9A-Z]{16}',
    'DJANGO_SECRET_KEY\s*=\s*(?!change_me|replace_with_)',
    'POSTGRES_PASSWORD\s*=\s*(?!change_me|replace_with_)',
    'DOZZLE_BASIC_AUTH\s*=\s*(?!admin:\$\$apr1\$\$replace)',
    'password\s*[:=]\s*[''"][^''"]{10,}[''"]',
    'Password:\s+\S+'
)

function Test-IsExcludedPath {
    param([string] $Path)
    foreach ($part in $excludedPathParts) {
        if ($Path.Contains($part)) {
            return $true
        }
    }
    return $false
}

function Test-IsAllowedLine {
    param([string] $Line)
    foreach ($snippet in $allowedSnippets) {
        if ($Line.Contains($snippet)) {
            return $true
        }
    }
    return $false
}

$leaks = New-Object System.Collections.Generic.List[string]

Get-ChildItem -LiteralPath $root -Force -Recurse -File | ForEach-Object {
    $fullName = $_.FullName
    if (Test-IsExcludedPath $fullName) {
        return
    }

    $relative = $fullName
    if ($fullName.StartsWith($rootPath)) {
        $relative = $fullName.Substring($rootPath.Length).TrimStart("\")
    }

    if ($blockedEnvFiles -contains $_.Name) {
        if ($allowedEnvFiles -notcontains $relative) {
            $leaks.Add("Committed environment file: $fullName")
        }
        return
    }

    foreach ($pattern in $secretPatterns) {
        Select-String -LiteralPath $fullName -Pattern $pattern -AllMatches -ErrorAction SilentlyContinue | ForEach-Object {
            if (-not (Test-IsAllowedLine $_.Line)) {
                $leaks.Add("${relative}:$($_.LineNumber): $($_.Line.Trim())")
            }
        }
    }
}

if ($leaks.Count -gt 0) {
    Write-Error ("Potential committed secret(s):`n" + ($leaks -join "`n"))
}

Write-Host "No production secrets detected. Local demo credentials and placeholder values are allowlisted."
