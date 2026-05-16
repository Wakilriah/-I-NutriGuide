param(
    [Parameter(Mandatory = $true)]
    [string]$HostName,
    [string]$User = "root",
    [string]$RemotePath = "/opt/inutriguide",
    [string]$RepoUrl = "",
    [string]$KeyFile = ""
)

$ErrorActionPreference = "Stop"
$target = "$User@$HostName"
$localBootstrap = Join-Path $PSScriptRoot "bootstrap-vps.sh"
$remoteBootstrap = "/tmp/inutriguide-bootstrap-vps.sh"
$sshArgs = @()

if ($KeyFile) {
    $sshArgs += @("-i", $KeyFile)
}

& scp @sshArgs $localBootstrap "${target}:${remoteBootstrap}"
if ($LASTEXITCODE -ne 0) {
    throw "Failed to upload bootstrap script to $target."
}

& ssh @sshArgs $target "chmod +x $remoteBootstrap && REPO_URL='$RepoUrl' APP_DIR='$RemotePath' DEPLOY_USER='$User' $remoteBootstrap"
if ($LASTEXITCODE -ne 0) {
    throw "VPS bootstrap failed on $target."
}

Write-Host "VPS bootstrap completed on $target."
