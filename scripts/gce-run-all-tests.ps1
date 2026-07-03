<#
.SYNOPSIS
  Default test runner: refresh chrysalis-test-vm and run full suite (optionally detached).

.DESCRIPTION
  Uploads local git HEAD, then runs scripts/gce-run-all-tests.sh on the Linux VM.
  Use -Detach so the suite keeps running after SSH returns (laptop can sleep).

.EXAMPLE
  .\scripts\gce-run-all-tests.ps1 -Project chrysalis-dev-f5x6qv
  .\scripts\gce-run-all-tests.ps1 -Project chrysalis-dev-f5x6qv -Detach
  .\scripts\gce-run-all-tests.ps1 -Project chrysalis-dev-f5x6qv -SkipRefresh -Status
  .\scripts\gce-run-all-tests.ps1 -Project chrysalis-dev-f5x6qv -FetchReports
#>
param(
  [string] $Project = $(if ($env:CHRYSALIS_GCE_PROJECT) { $env:CHRYSALIS_GCE_PROJECT } else { "chrysalis-dev-f5x6qv" }),
  [string] $Zone = "us-central1-a",
  [string] $Name = "chrysalis-test-vm",
  [switch] $Detach,
  [switch] $SkipRefresh,
  [switch] $Status,
  [switch] $FetchReports,
  [switch] $SyncOnly,
  [switch] $FullVitest,
  [switch] $TunnelThroughIap
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot "gce-auth-activate.ps1") | Out-Null
Initialize-ChrysalisGceAuth -Project $Project -RepoRoot $repoRoot -Quiet | Out-Null
$VmName = $Name
$sshExtra = @()
if ($TunnelThroughIap) { $sshExtra = @("--tunnel-through-iap") }

function Invoke-Gcloud {
  param([string[]] $GcloudArgs)
  & gcloud @GcloudArgs
  if ($LASTEXITCODE -ne 0) { throw "gcloud failed: gcloud $($GcloudArgs -join ' ')" }
}

function Sync-GceRunnerScripts {
  $runnerNames = @(
    "gce-cleanup-vm-temp.sh",
    "gce-run-all-tests.sh",
    "gce-run-phase.sh",
    "gce-progress.mjs",
    "gce-hub-strategic-vitest.sh",
    "gce-ensure-fixture-emits.sh",
    "gce-ensure-wptp-matrix.sh",
    "gce-hub-authoring-vitest-one.sh",
    "gce-hub-gold-verify.sh",
    "gce-hub-gold-trace-replay.sh",
    "gce-hub-gold-gates.sh",
    "gce-cwl-batch-v40-fast.sh",
    "gce-cwl-batch-v60.sh",
    "gce-phase-list.mjs",
    "gce-run-mega-slice.sh",
    "gce-run-mega-phases.sh",
    "gce-cwl-batch-v106.sh",
    "gce-cwl-batch-v107.sh",
    "gce-cwl-batch-v110.sh",
    "gce-resume-from-mega-phases.sh",
    "gce-restart-megas-only.sh",
    "gce-finish-post110-only.sh",
    "gce-restart-post110-only.sh",
    "gce-post110-progress.sh",
    "gce-resume-from-gold-gates.sh",
    "gce-resume-from-hub-completion.sh",
    "gce-resume-from-cwl-batch-v40.sh",
    "gce-resume-from-hub-express-flagship.sh",
    "gce-resume-from-gold-trace-replay.sh",
    "gce-resume-from-hub-cwl.sh",
    "gce-vm-verify-suite.sh",
    "gce-hub-authoring-batch-vitest.sh",
    "gce-hub-cwl-vitest.sh",
    "gce-strategic-plan-phase8-strict.sh",
    "gce-phase8-strict-only.sh",
    "gce-migration-os-close.sh",
    "gce-migration-os-only.sh"
  )
  $hubIngestNames = @(
    "hub-completion.mjs",
    "hub-completion-gce-fast.mjs",
    "hub-gce-mega-dedupe.mjs",
    "hub-smoke-progress.mjs",
    "hub-php-wedge-batch-smoke.mjs",
    "hub-oracle-product-ultra-batch-smoke.mjs",
    "hub-verify-standalone-mega-batch-smoke.mjs",
    "hub-php-nextjs-verify.mjs",
    "hub-node-express-oracle-verify.mjs",
    "hub-gaps-ingest-strict-batch-smoke.mjs",
    "hub-gaps-ingest-closure-batch-smoke.mjs",
    "hub-oracle-standalone-batch-smoke.mjs",
    "hub-php-nextjs-verify-batch-smoke.mjs",
    "hub-cwl-authoring-batch-v106-smoke.mjs",
    "hub-cwl-fullstack-gates.mjs",
    "hub-verify-replay.mjs",
    "hub-verify-http.mjs",
    "hub-verify-http-probe-worker.mjs",
    "hub-verify-probe-corpus.mjs",
    "hub-verify-gaps-post110-reinforcement-smoke.mjs",
    "hub-flagship-verify-http-batch-smoke.mjs",
    "hub-flagship-verify-http-fastify-batch-smoke.mjs",
    "hub-laravel-auth-probe-reingest-verify-closure-smoke.mjs",
    "hub-laravel-auth-probe-reingest-verify-replay-smoke.mjs"
  )
  Write-Host "=== Sync runner scripts to VM (local workspace; may differ from git HEAD) ==="
  foreach ($name in $runnerNames) {
    $local = Join-Path $PSScriptRoot $name
    if (-not (Test-Path -LiteralPath $local)) {
      throw "Missing runner script: $local"
    }
    $remote = "${VmName}:chrysalis-test/scripts/${name}"
    & gcloud compute scp --zone=$Zone --project=$Project @sshExtra -- "$local" $remote
    if ($LASTEXITCODE -ne 0) { throw "scp failed for $name" }
  }
  foreach ($name in $hubIngestNames) {
    $local = Join-Path $PSScriptRoot "hub-ingest\$name"
    if (-not (Test-Path -LiteralPath $local)) {
      throw "Missing hub-ingest script: $local"
    }
    $remote = "${VmName}:chrysalis-test/scripts/hub-ingest/${name}"
    & gcloud compute scp --zone=$Zone --project=$Project @sshExtra -- "$local" $remote
    if ($LASTEXITCODE -ne 0) { throw "scp failed for hub-ingest/$name" }
  }
  $chmodArgs = Build-ChrysalisGceSshArgs -Name $VmName -Zone $Zone -Project $Project -Extra $sshExtra -Command "sed -i 's/\r$//' ~/chrysalis-test/scripts/gce-*.sh && chmod +x ~/chrysalis-test/scripts/gce-*.sh"
  Invoke-Gcloud -GcloudArgs $chmodArgs
}

if ($Status) {
  & "$PSScriptRoot\gce-test-status.ps1" -Project $Project -Zone $Zone -Name $Name @sshExtra
  exit $LASTEXITCODE
}

if ($FetchReports) {
  & "$PSScriptRoot\gce-fetch-reports.ps1" -Project $Project -Zone $Zone -Name $VmName @sshExtra
  exit $LASTEXITCODE
}

if ($SyncOnly) {
  Sync-GceRunnerScripts
  exit 0
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

Sync-GceRunnerScripts

$gceFullVitest = if ($FullVitest.IsPresent) { "1" } else { "0" }
$remoteEnv = "export CHRYSALIS_STATUS_REPO=~/chrysalis-test CHRYSALIS_GCE_FULL_VITEST=${gceFullVitest} CHRYSALIS_GCE_ALL_TESTS=1 CHRYSALIS_GCE_HUB_COMPLETION_FAST=1 CHRYSALIS_GCE_SLIM_HUB_STRATEGIC=1"

if ($Detach) {
  Write-Host "=== Start detached test run on ${VmName} ==="
  $start = @"
chmod +x ~/chrysalis-test/scripts/gce-run-all-tests.sh
cd ~/chrysalis-test
mkdir -p reports/ci
${remoteEnv}
nohup bash scripts/gce-run-all-tests.sh </dev/null >>reports/ci/gce-all-tests.log 2>&1 &
sleep 1
if test -f ~/.chrysalis-gce-test.pid; then echo started pid=`$(cat ~/.chrysalis-gce-test.pid); else echo 'WARN: pid file missing (check gce-all-tests.log)'; fi
"@
  Invoke-ChrysalisGceSsh -Name $VmName -Zone $Zone -Project $Project -Extra $sshExtra -Command $start
  Write-Host ""
  Write-Host "Detached. Status:  pnpm run test:gce:status"
  Write-Host "Fetch logs:     pnpm run test:gce:fetch"
  exit 0
}

Write-Host "=== Run tests on ${VmName} (foreground; SSH stays open) ==="
$foreground = "chmod +x ~/chrysalis-test/scripts/gce-run-all-tests.sh && cd ~/chrysalis-test && ${remoteEnv} bash scripts/gce-run-all-tests.sh"
Invoke-ChrysalisGceSsh -Name $VmName -Zone $Zone -Project $Project -Extra $sshExtra -Command $foreground
& "$PSScriptRoot\gce-fetch-reports.ps1" -Project $Project -Zone $Zone -Name $Name @sshExtra
