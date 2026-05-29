<#
.SYNOPSIS
  Run Chrysalis verify suite on Linux + Windows GCE VMs (local orchestration, no GitHub Actions).

.DESCRIPTION
  Linux: refreshes chrysalis-test-vm (Debian) and runs gce-vm-verify-suite.sh
  Windows: refreshes/creates chrysalis-test-vm-win and runs gce-vm-verify-suite.ps1 via bootstrap

.EXAMPLE
  .\scripts\gce-cross-platform-verify.ps1 -Project chrysalis-dev-f5x6qv

.EXAMPLE
  .\scripts\gce-cross-platform-verify.ps1 -Project chrysalis-dev-f5x6qv -LinuxOnly
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $Project,
  [string] $Zone = "us-central1-a",
  [string] $LinuxName = "chrysalis-test-vm",
  [string] $WindowsName = "chrysalis-test-vm-win",
  [switch] $LinuxOnly,
  [switch] $WindowsOnly,
  [switch] $TunnelThroughIap,
  [switch] $RunHubFinish
)

$ErrorActionPreference = "Stop"
$env:CLOUDSDK_CORE_DISABLE_PROMPTS = "1"
$repoRoot = Split-Path -Parent $PSScriptRoot
$refresh = Join-Path $PSScriptRoot "gce-test-vm-refresh.ps1"
$winScript = Join-Path $PSScriptRoot "gce-test-vm-windows.ps1"

$results = @()

function Test-Linux {
  Write-Host "=== Linux GCE ($LinuxName) ==="
  $refreshArgs = @("-Project", $Project, "-Zone", $Zone, "-Name", $LinuxName)
  if ($TunnelThroughIap) { $refreshArgs += "-TunnelThroughIap" }
  if (-not $RunHubFinish) { $refreshArgs += "-SkipHubFinish" }
  & $refresh @refreshArgs
  if ($LASTEXITCODE -ne 0) { throw "Linux refresh failed" }

  $sshExtra = @()
  if ($TunnelThroughIap) { $sshExtra = @("--tunnel-through-iap") }

  $remote = "chmod +x ~/chrysalis-test/scripts/gce-vm-verify-suite.sh && CHRYSALIS_STATUS_REPO=~/chrysalis-test bash ~/chrysalis-test/scripts/gce-vm-verify-suite.sh"
  & gcloud compute ssh $LinuxName --zone=$Zone --project=$Project @sshExtra --command=$remote
  if ($LASTEXITCODE -ne 0) { throw "Linux verify suite failed" }
  $results += @{ platform = "linux"; ok = $true; instance = $LinuxName }
}

function Test-Windows {
  Write-Host "=== Windows GCE ($WindowsName) ==="
  $winArgs = @("-Project", $Project, "-Zone", $Zone, "-Name", $WindowsName, "-DeployFromLocalGit")
  if ($TunnelThroughIap) { $winArgs += "-TunnelThroughIap" }
  & $winScript @winArgs
  if ($LASTEXITCODE -ne 0) { throw "Windows verify failed" }
  $results += @{ platform = "windows"; ok = $true; instance = $WindowsName }
}

if (-not $WindowsOnly) { Test-Linux }
if (-not $LinuxOnly) { Test-Windows }

$report = @{
  kind = "chrysalis.gce.cross-platform-verify"
  schemaVersion = 1
  ok = $true
  project = $Project
  zone = $Zone
  results = $results
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
}
$outPath = Join-Path $repoRoot "reports/ci/gce-cross-platform-verify.json"
New-Item -ItemType Directory -Force -Path (Split-Path $outPath) | Out-Null
$report | ConvertTo-Json -Depth 6 | Set-Content -Path $outPath -Encoding utf8
Write-Host ""
Write-Host "=== Cross-platform GCE verify OK ==="
Write-Host "Report: $outPath"
Write-Host ($report | ConvertTo-Json -Depth 6)
