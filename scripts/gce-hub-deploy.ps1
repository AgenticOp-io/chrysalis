<#
.SYNOPSIS
  One-command fully automated Translation Hub deploy to chrysalis-test-vm.

.DESCRIPTION
  1. Optional local build:hub-all
  2. git archive HEAD + upload + bootstrap (full workspace, WPTP, verify, restart hub)
  3. Print external hub URL

.EXAMPLE
  .\scripts\gce-hub-deploy.ps1 -Project chrysalis-dev-f5x6qv
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $Project,
  [string] $Zone = "us-central1-a",
  [string] $Name = "",
  [switch] $TunnelThroughIap,
  [switch] $SkipLocalBuild,
  [switch] $SkipHubFinish
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "gce-protected-instances.ps1")
if (-not $Name) { $Name = Get-ChrysalisGceDefaultInstance }
$repoRoot = Split-Path -Parent $PSScriptRoot
$refresh = Join-Path $PSScriptRoot "gce-test-vm-refresh.ps1"

if (-not $SkipLocalBuild) {
  Write-Host "Local build:hub-all..."
  Push-Location $repoRoot
  try {
    & pnpm run build:hub-all
    if ($LASTEXITCODE -ne 0) { throw "build:hub-all failed" }
  } finally {
    Pop-Location
  }
}

if ($SkipHubFinish) {
  $env:CHRYSALIS_SKIP_HUB_FINISH = "1"
} else {
  Remove-Item Env:CHRYSALIS_SKIP_HUB_FINISH -ErrorAction SilentlyContinue
}

if ($TunnelThroughIap) {
  & $refresh -Project $Project -Zone $Zone -Name $Name -TunnelThroughIap
} else {
  & $refresh -Project $Project -Zone $Zone -Name $Name
}
if ($LASTEXITCODE -ne 0) { throw "gce-test-vm-refresh failed" }

$ipArgs = @(
  "compute", "instances", "describe", $Name,
  "--zone=$Zone", "--project=$Project",
  "--format=get(networkInterfaces[0].accessConfigs[0].natIP)"
)
$ip = (& gcloud @ipArgs 2>$null | Out-String).Trim()
$port = if ($env:CHRYSALIS_STATUS_PORT) { $env:CHRYSALIS_STATUS_PORT } else { "19090" }

Write-Host ""
Write-Host "=== Translation Hub deploy complete ==="
if ($ip) {
  Write-Host "Hub URL:    http://${ip}:${port}/"
  Write-Host "Demo guide: http://${ip}:${port}/#/guide"
} else {
  Write-Host "Hub port:   ${port} (no external IP - use IAP SSH tunnel)"
}
Write-Host "SSH:        gcloud compute ssh $Name --zone=$Zone --project=$Project"
