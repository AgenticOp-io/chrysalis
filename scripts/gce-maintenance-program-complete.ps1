<#
.SYNOPSIS
  Run maintenance program complete smoke on chrysalis-test-vm (GCE only).
#>
param(
  [string] $Project = $(if ($env:CHRYSALIS_GCE_PROJECT) { $env:CHRYSALIS_GCE_PROJECT } else { "chrysalis-dev-f5x6qv" }),
  [string] $Zone = "us-central1-a",
  [string] $Name = "",
  [switch] $Detach,
  [switch] $SkipRefresh,
  [switch] $Status
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "gce-auth-activate.ps1") | Out-Null
. (Join-Path $PSScriptRoot "gce-protected-instances.ps1")
if (-not $Name) { $Name = Get-ChrysalisGceDefaultInstance }
$VmName = $Name

function Sync-MaintenanceRunnerScript {
  $local = Join-Path $PSScriptRoot "gce-maintenance-program-complete-only.sh"
  if (-not (Test-Path -LiteralPath $local)) { throw "Missing $local" }
  & gcloud compute scp --zone=$Zone --project=$Project -- "$local" "${VmName}:chrysalis-test/scripts/gce-maintenance-program-complete-only.sh"
  if ($LASTEXITCODE -ne 0) { throw "scp failed" }
  $chmod = Build-ChrysalisGceSshArgs -Name $VmName -Zone $Zone -Project $Project -Command "chmod +x ~/chrysalis-test/scripts/gce-maintenance-program-complete-only.sh && sed -i 's/\r$//' ~/chrysalis-test/scripts/gce-maintenance-program-complete-only.sh"
  & gcloud @chmod
  if ($LASTEXITCODE -ne 0) { throw "chmod failed" }
}

if ($Status) {
  Invoke-ChrysalisGceSsh -Name $VmName -Zone $Zone -Project $Project -Command "bash ~/chrysalis-test/scripts/gce-maintenance-diagnose.sh"
  exit 0
}

if (-not $SkipRefresh) {
  & (Join-Path $PSScriptRoot "gce-test-vm-refresh.ps1") -Project $Project -Zone $Zone -Name $Name -SkipHubFinish
}

Sync-MaintenanceRunnerScript

$remoteEnv = "export CHRYSALIS_STATUS_REPO=~/chrysalis-test CHRYSALIS_POC_SKIP_BUILD=1 CHRYSALIS_WEB_LLM_TRAJECTORY=1"

if ($Detach) {
  $start = @"
cd ~/chrysalis-test
mkdir -p reports/ci
rm -f reports/ci/gce-maintenance-program-complete.ok
${remoteEnv};
nohup bash scripts/gce-maintenance-program-complete-only.sh </dev/null >>reports/ci/gce-maintenance-program-complete-run.log 2>&1 &
sleep 2
pgrep -af gce-maintenance-program-complete-only || true
"@
  Invoke-ChrysalisGceSsh -Name $VmName -Zone $Zone -Project $Project -Command $start
  Write-Host "Detached. Status: powershell -File scripts/gce-maintenance-program-complete.ps1 -Status"
  exit 0
}

Invoke-ChrysalisGceSsh -Name $VmName -Zone $Zone -Project $Project -Command "cd ~/chrysalis-test && ${remoteEnv} && bash scripts/gce-maintenance-program-complete-only.sh"
& (Join-Path $PSScriptRoot "gce-fetch-reports.ps1") -Project $Project -Zone $Zone -Name $VmName
