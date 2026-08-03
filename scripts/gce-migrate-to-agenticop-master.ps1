<#
.SYNOPSIS
  Bootstrap Chrysalis onto agenticop-master (protected fusion host) from local git + optional legacy VM copy.

.DESCRIPTION
  1) Full bootstrap (apt/node/pnpm) of ~/chrysalis-test on agenticop-master
  2) Optionally copy chrysalis-staging (+ corpora) from chrysalis-test-vm
  3) Does NOT flip DNS or stop chrysalis-test-vm - operator cutover after hub smoke

  Protected by fixtures/ci/gce-protected-instances.json - never deletes agenticop-master / fusion-lab.
#>
param(
  [string] $Project = $(if ($env:CHRYSALIS_GCE_PROJECT) { $env:CHRYSALIS_GCE_PROJECT } else { "chrysalis-dev-f5x6qv" }),
  [string] $Zone = "us-central1-a",
  [string] $Target = "agenticop-master",
  [string] $Source = "chrysalis-test-vm",
  [switch] $SkipStagingCopy,
  [switch] $SkipHubFinish,
  [switch] $TunnelThroughIap
)

$ErrorActionPreference = "Stop"
$env:CLOUDSDK_CORE_DISABLE_PROMPTS = "1"
$env:CLOUDSDK_COMPUTE_SSH_USE_OPENSSH = "True"
$repoRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot "gce-auth-activate.ps1") | Out-Null
. (Join-Path $PSScriptRoot "gce-protected-instances.ps1")

$sshExtra = @()
if ($TunnelThroughIap) { $sshExtra = @("--tunnel-through-iap") }

function Invoke-Gcloud {
  param([string[]] $GcloudArgs)
  & gcloud @GcloudArgs
  if ($LASTEXITCODE -ne 0) { throw "gcloud failed: gcloud $($GcloudArgs -join ' ')" }
}

$st = (gcloud compute instances describe $Target --zone=$Zone --project=$Project --format="value(status)" 2>$null)
if ($st -ne "RUNNING") { throw "Target $Target status=$st (need RUNNING)" }

Write-Host "=== 1/3 Full bootstrap Chrysalis onto $Target ==="
$bootstrap = Join-Path $PSScriptRoot "gce-test-vm-bootstrap.sh"
$finish = Join-Path $PSScriptRoot "gce-hub-finish-deploy.sh"
$tarball = Join-Path $env:TEMP ("chrysalis-src-" + [guid]::NewGuid().ToString("n") + ".tar.gz")
$headSidecar = Join-Path $env:TEMP ("chrysalis-deployed-head-" + [guid]::NewGuid().ToString("n"))

Push-Location $repoRoot
try {
  $deployedHead = (& git rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0) { throw "git rev-parse HEAD failed" }
  & git archive --format=tar.gz -o $tarball HEAD
  if ($LASTEXITCODE -ne 0) { throw "git archive failed" }
  Set-Content -LiteralPath $headSidecar -Value $deployedHead -NoNewline
}
finally {
  Pop-Location
}

Invoke-Gcloud -GcloudArgs (@("compute", "scp", "--zone=$Zone", "--project=$Project") + $sshExtra + @($bootstrap, "${Target}:gce-test-vm-bootstrap.sh"))
Invoke-Gcloud -GcloudArgs (@("compute", "scp", "--zone=$Zone", "--project=$Project") + $sshExtra + @($finish, "${Target}:gce-hub-finish-deploy.sh"))
Invoke-Gcloud -GcloudArgs (@("compute", "scp", "--zone=$Zone", "--project=$Project") + $sshExtra + @($tarball, "${Target}:chrysalis-src.tgz"))
Invoke-Gcloud -GcloudArgs (@("compute", "scp", "--zone=$Zone", "--project=$Project") + $sshExtra + @($headSidecar, "${Target}:chrysalis-deployed-head"))

$gceHelpers = @(
  "gce-install-native-oracle-deps.sh",
  "gce-prep-intelligence-shorthand.sh",
  "gce-full-matrix-oracle-close-only.sh",
  "gce-maintenance-program-complete-only.sh",
  "gce-maintenance-diagnose.sh"
)
Invoke-Gcloud -GcloudArgs (@("compute", "ssh", "--zone=$Zone", "--project=$Project") + $sshExtra + @($Target, "--command=mkdir -p ~/chrysalis-gce-helpers"))
foreach ($helper in $gceHelpers) {
  $localHelper = Join-Path $PSScriptRoot $helper
  if (Test-Path -LiteralPath $localHelper) {
    Invoke-Gcloud -GcloudArgs (@("compute", "scp", "--zone=$Zone", "--project=$Project") + $sshExtra + @($localHelper, "${Target}:chrysalis-gce-helpers/$helper"))
  }
}
Remove-Item -LiteralPath $tarball -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $headSidecar -Force -ErrorAction SilentlyContinue

$skipFinish = if ($SkipHubFinish) { "1" } else { "0" }
$remoteBoot = @"
chmod +x ~/gce-test-vm-bootstrap.sh ~/gce-hub-finish-deploy.sh
export CHRYSALIS_TEST_USE_TARBALL=1 CHRYSALIS_AUTO_START_HUB=1 CHRYSALIS_DEPLOY_STRICT=1 CHRYSALIS_SKIP_HUB_FINISH=$skipFinish
unset CHRYSALIS_REFRESH_ONLY
~/gce-test-vm-bootstrap.sh
"@
Write-Host "Running full bootstrap on $Target (apt/node/pnpm + hub)..."
Invoke-Gcloud -GcloudArgs (@("compute", "ssh", "--zone=$Zone", "--project=$Project") + $sshExtra + @($Target, "--command=$remoteBoot"))

if (-not $SkipStagingCopy) {
  Write-Host "=== 2/3 Copy staging packs from $Source to $Target ==="
  $srcSt = (gcloud compute instances describe $Source --zone=$Zone --project=$Project --format="value(status)" 2>$null)
  if ($srcSt -ne "RUNNING") {
    Write-Host "WARN: $Source status=$srcSt - skip staging copy"
  }
  else {
    $packRemote = @'
set -euo pipefail
cd "$HOME"
tar czf /tmp/chrysalis-migrate-staging.tgz \
  --ignore-failed-read \
  chrysalis-staging \
  chrysalis-cobol-corpora \
  2>/dev/null || tar czf /tmp/chrysalis-migrate-staging.tgz chrysalis-staging
ls -lh /tmp/chrysalis-migrate-staging.tgz
'@
    Invoke-Gcloud -GcloudArgs (@("compute", "ssh", "--zone=$Zone", "--project=$Project") + $sshExtra + @($Source, "--command=$packRemote"))
    $localPack = Join-Path $env:TEMP ("chrysalis-migrate-staging-" + [guid]::NewGuid().ToString("n") + ".tgz")
    Invoke-Gcloud -GcloudArgs (@("compute", "scp", "--zone=$Zone", "--project=$Project") + $sshExtra + @("${Source}:/tmp/chrysalis-migrate-staging.tgz", $localPack))
    Invoke-Gcloud -GcloudArgs (@("compute", "scp", "--zone=$Zone", "--project=$Project") + $sshExtra + @($localPack, "${Target}:chrysalis-migrate-staging.tgz"))
    Remove-Item -LiteralPath $localPack -Force -ErrorAction SilentlyContinue
    $unpack = @'
set -euo pipefail
cd "$HOME"
tar xzf chrysalis-migrate-staging.tgz
rm -f chrysalis-migrate-staging.tgz
du -sh chrysalis-staging chrysalis-cobol-corpora 2>/dev/null || du -sh chrysalis-staging 2>/dev/null || true
'@
    Invoke-Gcloud -GcloudArgs (@("compute", "ssh", "--zone=$Zone", "--project=$Project") + $sshExtra + @($Target, "--command=$unpack"))
    Invoke-Gcloud -GcloudArgs (@("compute", "ssh", "--zone=$Zone", "--project=$Project") + $sshExtra + @($Source, "--command=rm -f /tmp/chrysalis-migrate-staging.tgz"))
  }
}

Write-Host "=== 3/3 Summary ==="
$ip = (gcloud compute instances describe $Target --zone=$Zone --project=$Project --format="get(networkInterfaces[0].accessConfigs[0].natIP)" 2>$null | Out-String).Trim()
Write-Host "Target: $Target  IP: $ip"
Write-Host "Hub smoke: http://${ip}:19090/"
Write-Host "DNS cutover (operator): point hub.agenticop.io + chrysalis.agenticop.io A records to $ip"
Write-Host "Then stop (do not delete) $Source to save money. Keep fusion-lab + agenticop-master protected."
Write-Host "Catalog: fixtures/ci/gce-protected-instances.json"
