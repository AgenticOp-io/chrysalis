<#
.SYNOPSIS
  Run GPU lab on chrysalis-gpu-lab via chrysalis-test-vm (same remote pattern as wisp:deploy:gce).

.DESCRIPTION
  Mirrors scripts/gce-wisp-local-stack-deploy.ps1 on chrysalis-test-vm:
    CLOUDSDK_COMPUTE_SSH_USE_OPENSSH=True
    gcloud compute scp VM:bare-filename  (no ~/ — DESIGN D412)
    gcloud compute ssh VM --command=...  (one shot; long work via nohup on VM)

.EXAMPLE
  pnpm run gpu-lab:gce
  pnpm run gpu-lab:gce:status
#>
param(
  [string] $Project = $(if ($env:CHRYSALIS_GCE_PROJECT) { $env:CHRYSALIS_GCE_PROJECT } else { "chrysalis-dev-f5x6qv" }),
  [string] $Zone = "us-central1-a",
  [string] $Name = "chrysalis-test-vm",
  [switch] $Detach,
  [switch] $SkipPrep,
  [switch] $SkipRefresh,
  [switch] $Status,
  [switch] $FetchReports,
  [switch] $TunnelThroughIap
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot "gce-auth-activate.ps1") | Out-Null
Initialize-ChrysalisGceAuth -Project $Project -RepoRoot $repoRoot -Quiet | Out-Null
$VmName = $Name
$sshExtra = @()
if ($TunnelThroughIap) { $sshExtra = @("--tunnel-through-iap") }

function Sync-GpuLabArtifacts {
  $artNames = @(
    "gce-gpu-lab-orchestrate.sh",
    "gce-gpu-lab-bootstrap.sh",
    "gce-gpu-lora-train.sh"
  )
  $manifest = Join-Path $repoRoot "reports/web-llm/lora/train-manifest.v1.json"
  $shards = Join-Path $repoRoot "reports/web-llm/dataset/training-shards.v1.jsonl"
  if (-not (Test-Path $manifest)) { throw "Missing $manifest - run pnpm run gpu-lab:prep" }
  if (-not (Test-Path $shards)) { throw "Missing $shards - run pnpm run gpu-lab:prep" }

  Write-Host "=== Sync GPU lab artifacts to ${VmName} ==="
  Invoke-ChrysalisGceSsh -Name $VmName -Zone $Zone -Project $Project -Extra $sshExtra -Command "mkdir -p chrysalis-test/gpu-lab-artifacts chrysalis-test/reports/ci"

  foreach ($scriptName in $artNames) {
    $local = Join-Path $PSScriptRoot $scriptName
    if (-not (Test-Path $local)) { throw "Missing $local" }
    & gcloud compute scp --zone=$Zone --project=$Project @sshExtra -- "$local" "${VmName}:chrysalis-test/gpu-lab-artifacts/$scriptName"
    if ($LASTEXITCODE -ne 0) { throw "scp failed for $scriptName" }
  }

  & gcloud compute scp --zone=$Zone --project=$Project @sshExtra -- "$manifest" "${VmName}:chrysalis-test/gpu-lab-artifacts/train-manifest.v1.json"
  if ($LASTEXITCODE -ne 0) { throw "scp failed for train-manifest" }
  & gcloud compute scp --zone=$Zone --project=$Project @sshExtra -- "$shards" "${VmName}:chrysalis-test/gpu-lab-artifacts/training-shards.v1.jsonl"
  if ($LASTEXITCODE -ne 0) { throw "scp failed for training-shards" }

  Invoke-ChrysalisGceSsh -Name $VmName -Zone $Zone -Project $Project -Extra $sshExtra -Command "chmod +x chrysalis-test/gpu-lab-artifacts/gce-gpu-lab-orchestrate.sh && sed -i 's/\r$//' chrysalis-test/gpu-lab-artifacts/gce-gpu-lab-orchestrate.sh"
}

if ($Status) {
  $remote = 'if test -f ~/chrysalis-test/reports/ci/gce-gpu-lab.ok; then echo STATUS_OK; else echo STATUS_RUNNING; fi; pgrep -af gce-gpu-lab-orchestrate 2>/dev/null | head -3 || true; tail -n 30 ~/chrysalis-test/reports/ci/gce-gpu-lab.log 2>/dev/null || echo no_log'
  try {
    Invoke-ChrysalisGceSsh -Name $VmName -Zone $Zone -Project $Project -Extra $sshExtra -Command $remote
    exit 0
  } catch {
    exit 1
  }
}

if ($FetchReports) {
  & "$PSScriptRoot\gce-fetch-reports.ps1" -Project $Project -Zone $Zone -Name $VmName @sshExtra
  exit $LASTEXITCODE
}

if (-not $SkipPrep) {
  Write-Host "=== CPU prep (manifest + shards) ==="
  & node (Join-Path $PSScriptRoot "web-llm-export-lora-manifest.mjs")
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

if (-not $SkipRefresh) {
  Write-Host "=== Refresh test VM (optional, skip with -SkipRefresh) ==="
  $refreshParams = @{
    Project       = $Project
    Zone          = $Zone
    Name          = $Name
    SkipHubFinish = $true
  }
  if ($TunnelThroughIap) { $refreshParams.TunnelThroughIap = $true }
  & "$PSScriptRoot\gce-test-vm-refresh.ps1" @refreshParams
}

Sync-GpuLabArtifacts

$maxMin = if ($env:CHRYSALIS_GPU_LAB_MAX_MINUTES) { $env:CHRYSALIS_GPU_LAB_MAX_MINUTES } else { "120" }
$dryRun = if ($env:CHRYSALIS_GPU_LAB_DRY_RUN) { $env:CHRYSALIS_GPU_LAB_DRY_RUN } else { "1" }

if ($Detach) {
  Write-Host "=== Start detached GPU lab on ${VmName} ==="
  $remoteCmd = @"
set -e
cd ~/chrysalis-test
mkdir -p reports/ci gpu-lab-artifacts
rm -f reports/ci/gce-gpu-lab.ok
export CHRYSALIS_STATUS_REPO=~/chrysalis-test CHRYSALIS_GCE_PROJECT=$Project CHRYSALIS_GPU_LAB_MAX_MINUTES=$maxMin CHRYSALIS_GPU_LAB_DRY_RUN=$dryRun
nohup bash gpu-lab-artifacts/gce-gpu-lab-orchestrate.sh </dev/null >>reports/ci/gce-gpu-lab.log 2>&1 &
sleep 2
if pgrep -f gce-gpu-lab-orchestrate.sh >/dev/null 2>&1; then echo 'started gpu-lab orchestrator'; else echo 'WARN: worker not found'; fi
"@
  Invoke-ChrysalisGceSsh -Name $VmName -Zone $Zone -Project $Project -Extra $sshExtra -Command $remoteCmd
  Write-Host ""
  Write-Host "Detached. Status: pnpm run gpu-lab:gce:status"
  Write-Host "Log on VM:       ~/chrysalis-test/reports/ci/gce-gpu-lab.log"
  exit 0
}

Write-Host "=== Run GPU lab orchestrator on ${VmName} (foreground) ==="
$remoteCmd = "cd ~/chrysalis-test && export CHRYSALIS_STATUS_REPO=~/chrysalis-test CHRYSALIS_GCE_PROJECT=$Project CHRYSALIS_GPU_LAB_MAX_MINUTES=$maxMin CHRYSALIS_GPU_LAB_DRY_RUN=$dryRun && bash gpu-lab-artifacts/gce-gpu-lab-orchestrate.sh"
Invoke-ChrysalisGceSsh -Name $VmName -Zone $Zone -Project $Project -Extra $sshExtra -Command $remoteCmd
& "$PSScriptRoot\gce-fetch-reports.ps1" -Project $Project -Zone $Zone -Name $VmName @sshExtra
