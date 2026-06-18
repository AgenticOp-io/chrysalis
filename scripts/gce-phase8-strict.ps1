<#
.SYNOPSIS
  Run Phase 8 strict product proof on chrysalis-test-vm (GCE only).

.DESCRIPTION
  Refreshes VM to local git HEAD, syncs runner scripts, starts detached:
  CHRYSALIS_STRICT_STRATEGIC_PLAN=1 hub:strategic-plan-phase8-product-proof-close-smoke

  Strict Phase 8 must not run on Windows locally (fixture lock contention).

.EXAMPLE
  pnpm run test:gce:phase8-strict
  pnpm run test:gce:phase8-strict:status
  pnpm run test:gce:phase8-strict:foreground
#>
param(
  [string] $Project = $(if ($env:CHRYSALIS_GCE_PROJECT) { $env:CHRYSALIS_GCE_PROJECT } else { "chrysalis-dev-f5x6qv" }),
  [string] $Zone = "us-central1-a",
  [string] $Name = "chrysalis-test-vm",
  [switch] $Detach,
  [switch] $SkipRefresh,
  [switch] $Status,
  [switch] $FetchReports,
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

function Sync-Phase8RunnerScripts {
  $runnerNames = @(
    "gce-run-phase.sh",
    "gce-progress.mjs",
    "gce-phase-list.mjs",
    "gce-ensure-fixture-emits.sh",
    "gce-strategic-plan-phase8-strict.sh",
    "gce-phase8-strict-only.sh"
  )
  $hubIngestNames = @(
    "hub-cwl-fullstack-gates.mjs",
    "strategic-plan-skips.mjs",
    "hub-strategic-plan-phase8-product-proof-close-smoke.mjs",
    "hub-smoke-progress.mjs"
  )
  Write-Host "=== Sync Phase 8 runner scripts to VM ==="
  foreach ($name in $runnerNames) {
    $local = Join-Path $PSScriptRoot $name
    if (-not (Test-Path -LiteralPath $local)) { throw "Missing runner script: $local" }
    $remote = "${VmName}:chrysalis-test/scripts/${name}"
    & gcloud compute scp --zone=$Zone --project=$Project @sshExtra -- "$local" $remote
    if ($LASTEXITCODE -ne 0) { throw "scp failed for $name" }
  }
  foreach ($name in $hubIngestNames) {
    $local = Join-Path $PSScriptRoot "hub-ingest\$name"
    if (-not (Test-Path -LiteralPath $local)) { throw "Missing hub-ingest script: $local" }
    $remote = "${VmName}:chrysalis-test/scripts/hub-ingest/${name}"
    & gcloud compute scp --zone=$Zone --project=$Project @sshExtra -- "$local" $remote
    if ($LASTEXITCODE -ne 0) { throw "scp failed for hub-ingest/$name" }
  }
  $chmodArgs = @(
    "compute", "ssh", $VmName, "--zone=$Zone", "--project=$Project"
  ) + $sshExtra + @(
    "--command=chmod +x ~/chrysalis-test/scripts/gce-strategic-plan-phase8-strict.sh ~/chrysalis-test/scripts/gce-phase8-strict-only.sh && sed -i 's/\r$//' ~/chrysalis-test/scripts/gce-strategic-plan-phase8-strict.sh ~/chrysalis-test/scripts/gce-phase8-strict-only.sh"
  )
  Invoke-Gcloud -GcloudArgs $chmodArgs
}

if ($Status) {
  $remote = @'
if test -f ~/chrysalis-test/reports/ci/gce-phase8-strict.ok; then echo 'STATUS: OK (gce-phase8-strict.ok)'; else echo 'STATUS: running or failed (no ok marker)'; fi
WORKER=$(pgrep -f 'gce-phase8-strict-only.sh|gce-strategic-plan-phase8-strict.sh' 2>/dev/null | head -1 || true)
if [ -n "$WORKER" ]; then echo "PID: $WORKER (phase8 strict alive)"; fi
echo '--- phase log tail ---'
tail -n 30 ~/chrysalis-test/reports/ci/gce-phase-strategic-plan-phase8-strict.log 2>/dev/null || tail -n 30 ~/chrysalis-test/reports/ci/gce-phase8-strict-run.log 2>/dev/null || echo '(no log yet)'
'@
  $gcloudArgs = @("compute", "ssh", $VmName, "--zone=$Zone", "--project=$Project") + $sshExtra + @("--command", $remote)
  & gcloud @gcloudArgs
  exit $LASTEXITCODE
}

if ($FetchReports) {
  & "$PSScriptRoot\gce-fetch-reports.ps1" -Project $Project -Zone $Zone -Name $VmName @sshExtra
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

Sync-Phase8RunnerScripts

$remoteEnv = "export CHRYSALIS_STATUS_REPO=~/chrysalis-test CHRYSALIS_STRICT_STRATEGIC_PLAN=1"

if ($Detach) {
  Write-Host "=== Start detached Phase 8 strict on ${VmName} ==="
  $start = @"
cd ~/chrysalis-test
mkdir -p reports/ci
rm -f reports/ci/gce-phase8-strict.ok
${remoteEnv}
nohup bash scripts/gce-phase8-strict-only.sh </dev/null >>reports/ci/gce-phase8-strict-run.log 2>&1 &
sleep 2
if pgrep -f gce-phase8-strict-only.sh >/dev/null 2>&1; then echo 'started phase8 strict worker'; else echo 'WARN: worker not found (check gce-phase8-strict-run.log)'; fi
"@
  $gcloudArgs = @("compute", "ssh", $VmName, "--zone=$Zone", "--project=$Project") + $sshExtra + @("--command=$start")
  Invoke-Gcloud -GcloudArgs $gcloudArgs
  Write-Host ""
  Write-Host "Detached. Status:  pnpm run test:gce:phase8-strict:status"
  Write-Host "Full status:     pnpm run test:gce:status"
  Write-Host "Fetch logs:      pnpm run test:gce:fetch"
  exit 0
}

Write-Host "=== Run Phase 8 strict on ${VmName} (foreground) ==="
$foreground = "cd ~/chrysalis-test && ${remoteEnv} bash scripts/gce-phase8-strict-only.sh"
$gcloudArgs = @("compute", "ssh", $VmName, "--zone=$Zone", "--project=$Project") + $sshExtra + @("--command=$foreground")
Invoke-Gcloud -GcloudArgs $gcloudArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& "$PSScriptRoot\gce-fetch-reports.ps1" -Project $Project -Zone $Zone -Name $VmName @sshExtra
