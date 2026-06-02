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
  [switch] $FullVitest,
  [switch] $TunnelThroughIap
)

$ErrorActionPreference = "Stop"
$env:CLOUDSDK_CORE_DISABLE_PROMPTS = "1"
$repoRoot = Split-Path -Parent $PSScriptRoot
# $Name is a PowerShell automatic variable inside nested functions; use $VmName for gcloud.
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
    "gce-run-all-tests.sh",
    "gce-run-phase.sh",
    "gce-hub-strategic-vitest.sh",
    "gce-vm-verify-suite.sh",
    "gce-cwl-batch-v40-fast.sh"
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
  $chmodArgs = @("compute", "ssh", $VmName, "--zone=$Zone", "--project=$Project") + $sshExtra + @(
    "--command=chmod +x ~/chrysalis-test/scripts/gce-run-all-tests.sh ~/chrysalis-test/scripts/gce-run-phase.sh ~/chrysalis-test/scripts/gce-hub-strategic-vitest.sh ~/chrysalis-test/scripts/gce-vm-verify-suite.sh ~/chrysalis-test/scripts/gce-cwl-batch-v40-fast.sh"
  )
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
$remoteEnv = "export CHRYSALIS_STATUS_REPO=~/chrysalis-test CHRYSALIS_GCE_FULL_VITEST=${gceFullVitest} CHRYSALIS_GCE_ALL_TESTS=1 CHRYSALIS_GCE_SLIM_HUB_STRATEGIC=1"

if ($Detach) {
  Write-Host "=== Start detached test run on ${VmName} ==="
  $start = @"
chmod +x ~/chrysalis-test/scripts/gce-run-all-tests.sh
cd ~/chrysalis-test
mkdir -p reports/ci
${remoteEnv}
nohup bash scripts/gce-run-all-tests.sh </dev/null >>reports/ci/gce-all-tests.log 2>&1 &
echo `$! > ~/.chrysalis-gce-test.pid
echo started pid=`$(cat ~/.chrysalis-gce-test.pid)
"@
  $gcloudArgs = @("compute", "ssh", $VmName, "--zone=$Zone", "--project=$Project") + $sshExtra + @("--command=$start")
  Invoke-Gcloud -GcloudArgs $gcloudArgs
  Write-Host ""
  Write-Host "Detached. Status:  pnpm run test:gce:status"
  Write-Host "Fetch logs:     pnpm run test:gce:fetch"
  exit 0
}

Write-Host "=== Run tests on ${VmName} (foreground; SSH stays open) ==="
$foreground = "chmod +x ~/chrysalis-test/scripts/gce-run-all-tests.sh && cd ~/chrysalis-test && ${remoteEnv} bash scripts/gce-run-all-tests.sh"
$gcloudArgs = @("compute", "ssh", $VmName, "--zone=$Zone", "--project=$Project") + $sshExtra + @("--command=$foreground")
Invoke-Gcloud -GcloudArgs $gcloudArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& "$PSScriptRoot\gce-fetch-reports.ps1" -Project $Project -Zone $Zone -Name $Name @sshExtra
