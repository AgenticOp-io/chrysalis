<#
.SYNOPSIS
  Run GPU lab bootstrap/sync/train on chrysalis-gpu-lab via chrysalis-test-vm (no Windows Plink to GPU VM).

.DESCRIPTION
  From Windows, only SSH/SCP to the CPU test VM (same as test:gce:migration-os).
  The test VM uses gcloud + internal IP to reach the GPU lab — no popup windows per retry.

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
$env:CLOUDSDK_CORE_DISABLE_PROMPTS = "1"
$repoRoot = Split-Path -Parent $PSScriptRoot
$VmName = $Name
$sshExtra = @()
if ($TunnelThroughIap) { $sshExtra = @("--tunnel-through-iap") }

. (Join-Path $PSScriptRoot "gce-auth-activate.ps1") | Out-Null
Initialize-ChrysalisGceAuth -Project $Project -RepoRoot $repoRoot -Quiet | Out-Null

function Get-GceClientSshFlags {
  # Windows: avoid PuTTY host-key popups; always pass --quiet with --command (never open a shell).
  if ($IsWindows -or $env:OS -eq "Windows_NT") {
    return @("--strict-host-key-checking=no", "--quiet")
  }
  return @("--quiet")
}

$clientSsh = @(Get-GceClientSshFlags)
$vmRepo = "chrysalis-test"

function Invoke-Gcloud {
  param([string[]] $GcloudArgs)
  & gcloud @GcloudArgs
  if ($LASTEXITCODE -ne 0) { throw "gcloud failed: gcloud $($GcloudArgs -join ' ')" }
}

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
  $remoteMk = "mkdir -p chrysalis-test/gpu-lab-artifacts chrysalis-test/reports/ci"
  $mkArgs = @(
    "compute", "ssh", $VmName, "--zone=$Zone", "--project=$Project"
  ) + $clientSsh + $sshExtra + @("--command", $remoteMk)
  Invoke-Gcloud -GcloudArgs $mkArgs

  foreach ($scriptName in $artNames) {
    $local = Join-Path $PSScriptRoot $scriptName
    if (-not (Test-Path $local)) { throw "Missing $local" }
    & gcloud compute scp --zone=$Zone --project=$Project @clientSsh @sshExtra -- "$local" "${VmName}:chrysalis-test/gpu-lab-artifacts/$scriptName"
    if ($LASTEXITCODE -ne 0) { throw "scp failed for $scriptName" }
  }

  & gcloud compute scp --zone=$Zone --project=$Project @clientSsh @sshExtra -- "$manifest" "${VmName}:chrysalis-test/gpu-lab-artifacts/train-manifest.v1.json"
  if ($LASTEXITCODE -ne 0) { throw "scp failed for train-manifest" }
  & gcloud compute scp --zone=$Zone --project=$Project @clientSsh @sshExtra -- "$shards" "${VmName}:chrysalis-test/gpu-lab-artifacts/training-shards.v1.jsonl"
  if ($LASTEXITCODE -ne 0) { throw "scp failed for training-shards" }

  $chmod = "chmod +x chrysalis-test/gpu-lab-artifacts/gce-gpu-lab-orchestrate.sh && sed -i 's/\r$//' chrysalis-test/gpu-lab-artifacts/gce-gpu-lab-orchestrate.sh"
  $chmodArgs = @(
    "compute", "ssh", $VmName, "--zone=$Zone", "--project=$Project"
  ) + $clientSsh + $sshExtra + @("--command", $chmod)
  Invoke-Gcloud -GcloudArgs $chmodArgs
}

if ($Status) {
  $remote = @"
OK=0
test -f ${vmRepo}/reports/ci/gce-gpu-lab.ok && OK=1
pgrep -af gce-gpu-lab-orchestrate 2>/dev/null | head -3 || true
tail -n 30 ${vmRepo}/reports/ci/gce-gpu-lab.log 2>/dev/null || echo no_log
echo OK=`$OK
"@
  & gcloud compute ssh $VmName --zone=$Zone --project=$Project @clientSsh @sshExtra --command=$remote
  exit $LASTEXITCODE
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
$remoteEnv = "export CHRYSALIS_STATUS_REPO=`$HOME/chrysalis-test CHRYSALIS_GCE_PROJECT=$Project CHRYSALIS_GPU_LAB_MAX_MINUTES=$maxMin CHRYSALIS_GPU_LAB_DRY_RUN=$dryRun"

if ($Detach) {
  Write-Host "=== Start detached GPU lab on ${VmName} (orchestrates ${Project}/chrysalis-gpu-lab) ==="
  $start = @"
cd ${vmRepo}
mkdir -p reports/ci gpu-lab-artifacts
rm -f reports/ci/gce-gpu-lab.ok
${remoteEnv}
nohup bash gpu-lab-artifacts/gce-gpu-lab-orchestrate.sh </dev/null >>reports/ci/gce-gpu-lab.log 2>&1 &
sleep 2
if pgrep -f gce-gpu-lab-orchestrate.sh >/dev/null 2>&1; then echo 'started gpu-lab orchestrator'; else echo 'WARN: worker not found'; fi
"@
  $startArgs = @(
    "compute", "ssh", $VmName, "--zone=$Zone", "--project=$Project"
  ) + $clientSsh + $sshExtra + @("--command=$start")
  Invoke-Gcloud -GcloudArgs $startArgs
  Write-Host ""
  Write-Host "Detached. Status: pnpm run gpu-lab:gce:status"
  Write-Host "Log on VM:       ~/chrysalis-test/reports/ci/gce-gpu-lab.log"
  exit 0
}

Write-Host "=== Run GPU lab orchestrator on ${VmName} (foreground) ==="
$foreground = "cd ${vmRepo} && ${remoteEnv} bash gpu-lab-artifacts/gce-gpu-lab-orchestrate.sh"
$fgArgs = @(
  "compute", "ssh", $VmName, "--zone=$Zone", "--project=$Project"
) + $clientSsh + $sshExtra + @("--command=$foreground")
Invoke-Gcloud -GcloudArgs $fgArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& "$PSScriptRoot\gce-fetch-reports.ps1" -Project $Project -Zone $Zone -Name $VmName @sshExtra
