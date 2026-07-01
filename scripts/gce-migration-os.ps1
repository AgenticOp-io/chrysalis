<#
.SYNOPSIS
  Run Migration OS close smokes on chrysalis-test-vm (GCE only).

.DESCRIPTION
  Refreshes VM to local git HEAD, syncs runner scripts, starts detached or foreground:
  G8560 + G8550 + G8290 + G8310 + G8570 (optional G8320 live with -WispLive).

.EXAMPLE
  pnpm run test:gce:migration-os
  pnpm run test:gce:migration-os:status
  pnpm run test:gce:migration-os:foreground
#>
param(
  [string] $Project = $(if ($env:CHRYSALIS_GCE_PROJECT) { $env:CHRYSALIS_GCE_PROJECT } else { "chrysalis-dev-f5x6qv" }),
  [string] $Zone = "us-central1-a",
  [string] $Name = "chrysalis-test-vm",
  [switch] $Detach,
  [switch] $SkipRefresh,
  [switch] $Status,
  [switch] $FetchReports,
  [switch] $WispLive,
  [switch] $TunnelThroughIap
)

$ErrorActionPreference = "Stop"
$env:CLOUDSDK_CORE_DISABLE_PROMPTS = "1"
$repoRoot = Split-Path -Parent $PSScriptRoot
$VmName = $Name
$sshExtra = @()
if ($TunnelThroughIap) { $sshExtra = @("--tunnel-through-iap") }

function Invoke-Gcloud {
  param([string[]] $GcloudArgs)
  & gcloud @GcloudArgs
  if ($LASTEXITCODE -ne 0) { throw "gcloud failed: gcloud $($GcloudArgs -join ' ')" }
}

function Sync-MigrationOsRunnerScripts {
  $runnerNames = @(
    "gce-run-phase.sh",
    "gce-progress.mjs",
    "gce-migration-os-close.sh",
    "gce-migration-os-only.sh"
  )
  Write-Host "=== Sync Migration OS runner scripts to VM ==="
  foreach ($name in $runnerNames) {
    $local = Join-Path $PSScriptRoot $name
    if (-not (Test-Path -LiteralPath $local)) { throw "Missing runner script: $local" }
    $remote = "${VmName}:chrysalis-test/scripts/${name}"
    & gcloud compute scp --zone=$Zone --project=$Project @sshExtra -- "$local" $remote
    if ($LASTEXITCODE -ne 0) { throw "scp failed for $name" }
  }
  $chmodArgs = @(
    "compute", "ssh", $VmName, "--zone=$Zone", "--project=$Project"
  ) + $sshExtra + @(
    "--command=chmod +x ~/chrysalis-test/scripts/gce-migration-os-close.sh ~/chrysalis-test/scripts/gce-migration-os-only.sh && sed -i 's/\r$//' ~/chrysalis-test/scripts/gce-migration-os-close.sh ~/chrysalis-test/scripts/gce-migration-os-only.sh"
  )
  Invoke-Gcloud -GcloudArgs $chmodArgs
}

if ($Status) {
  $remote = 'if test -f ~/chrysalis-test/reports/ci/gce-migration-os.ok; then echo STATUS_OK; else echo STATUS_RUNNING; fi; pgrep -af gce-migration-os 2>/dev/null | head -3 || true; tail -n 25 ~/chrysalis-test/reports/ci/gce-phase-migration-os-close.log 2>/dev/null || tail -n 25 ~/chrysalis-test/reports/ci/gce-migration-os-run.log 2>/dev/null || echo no_log'
  $gcloudArgs = @("compute", "ssh", $VmName, "--zone=$Zone", "--project=$Project") + $sshExtra + @("--command", $remote)
  & gcloud @gcloudArgs
  exit $LASTEXITCODE
}

if ($FetchReports) {
  & "$PSScriptRoot\gce-fetch-reports.ps1" -Project $Project -Zone $Zone -Name $VmName -OperatorHubs @sshExtra
  exit $LASTEXITCODE
}

if (-not $SkipRefresh) {
  Write-Host "=== Refresh VM tree (local HEAD) ==="
  $refreshParams = @{
    Project       = $Project
    Zone          = $Zone
    Name          = $Name
    SkipHubFinish = $true
  }
  if ($TunnelThroughIap) { $refreshParams.TunnelThroughIap = $true }
  & "$PSScriptRoot\gce-test-vm-refresh.ps1" @refreshParams
}

Sync-MigrationOsRunnerScripts

$wispLiveEnv = if ($WispLive.IsPresent) { "export CHRYSALIS_GCE_WISP_LIVE=1" } else { "" }
$remoteEnv = "export CHRYSALIS_STATUS_REPO=~/chrysalis-test CHRYSALIS_POC_SKIP_BUILD=1 CHRYSALIS_WEB_LLM_TRAJECTORY=1; ${wispLiveEnv}"

if ($Detach) {
  Write-Host "=== Start detached Migration OS close on ${VmName} ==="
  $start = @"
cd ~/chrysalis-test
mkdir -p reports/ci
rm -f reports/ci/gce-migration-os.ok
${remoteEnv}
nohup bash scripts/gce-migration-os-only.sh </dev/null >>reports/ci/gce-migration-os-run.log 2>&1 &
sleep 2
if pgrep -f gce-migration-os-only.sh >/dev/null 2>&1; then echo 'started migration-os worker'; else echo 'WARN: worker not found (check gce-migration-os-run.log)'; fi
"@
  $gcloudArgs = @("compute", "ssh", $VmName, "--zone=$Zone", "--project=$Project") + $sshExtra + @("--command=$start")
  Invoke-Gcloud -GcloudArgs $gcloudArgs
  Write-Host ""
  Write-Host "Detached. Status:  pnpm run test:gce:migration-os:status"
  Write-Host "Fetch logs:      pnpm run test:gce:fetch"
  exit 0
}

Write-Host "=== Run Migration OS close on ${VmName} (foreground) ==="
$foreground = "cd ~/chrysalis-test && ${remoteEnv} bash scripts/gce-migration-os-only.sh"
$gcloudArgs = @("compute", "ssh", $VmName, "--zone=$Zone", "--project=$Project") + $sshExtra + @("--command=$foreground")
Invoke-Gcloud -GcloudArgs $gcloudArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& "$PSScriptRoot\gce-fetch-reports.ps1" -Project $Project -Zone $Zone -Name $VmName -OperatorHubs @sshExtra
