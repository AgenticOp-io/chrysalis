<#
.SYNOPSIS
  Refresh ~/chrysalis-test on an existing VM without apt/node churn (shared-VM safe).

.DESCRIPTION
  Uploads local git HEAD tarball + bootstrap with CHRYSALIS_REFRESH_ONLY=1 so apt-get
  and global Node setup are skipped. Runs hub finish (verify + restart operator on :19090).

.EXAMPLE
  .\scripts\gce-test-vm-refresh.ps1 -Project chrysalis-dev-f5x6qv
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $Project,
  [string] $Zone = "us-central1-a",
  [string] $Name = "",
  [switch] $TunnelThroughIap,
  [switch] $StartStatusServer,
  [switch] $SkipHubFinish
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot "gce-auth-activate.ps1") | Out-Null
. (Join-Path $PSScriptRoot "gce-protected-instances.ps1")
if (-not $Name) { $Name = Get-ChrysalisGceDefaultInstance }
$bootstrap = Join-Path $PSScriptRoot "gce-test-vm-bootstrap.sh"
$finish = Join-Path $PSScriptRoot "gce-hub-finish-deploy.sh"
$tarball = Join-Path $env:TEMP ("chrysalis-src-" + [guid]::NewGuid().ToString("n") + ".tar.gz")
$headSidecar = Join-Path $env:TEMP ("chrysalis-deployed-head-" + [guid]::NewGuid().ToString("n"))
$sshExtra = @()
if ($TunnelThroughIap) { $sshExtra = @("--tunnel-through-iap") }

Push-Location $repoRoot
try {
  Write-Host "Archiving local HEAD..."
  $deployedHead = (& git rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0) { throw "git rev-parse HEAD failed" }
  & git archive --format=tar.gz -o $tarball HEAD
  if ($LASTEXITCODE -ne 0) { throw "git archive failed" }
  Set-Content -LiteralPath $headSidecar -Value $deployedHead -NoNewline
}
finally {
  Pop-Location
}

Write-Host "Uploading to ${Name} (refresh-only, ~/chrysalis-test only)..."
& gcloud compute scp --zone=$Zone --project=$Project @sshExtra $bootstrap "${Name}:gce-test-vm-bootstrap.sh"
& gcloud compute scp --zone=$Zone --project=$Project @sshExtra $finish "${Name}:gce-hub-finish-deploy.sh"
& gcloud compute scp --zone=$Zone --project=$Project @sshExtra $tarball "${Name}:chrysalis-src.tgz"
& gcloud compute scp --zone=$Zone --project=$Project @sshExtra $headSidecar "${Name}:chrysalis-deployed-head"
$gceHelpers = @(
  "gce-install-native-oracle-deps.sh",
  "gce-prep-intelligence-shorthand.sh",
  "gce-full-matrix-oracle-close-only.sh",
  "gce-maintenance-program-complete-only.sh",
  "gce-maintenance-diagnose.sh"
)
& gcloud compute ssh --zone=$Zone --project=$Project @sshExtra $Name --command="mkdir -p ~/chrysalis-gce-helpers"
foreach ($helper in $gceHelpers) {
  $localHelper = Join-Path $PSScriptRoot $helper
  if (Test-Path -LiteralPath $localHelper) {
    & gcloud compute scp --zone=$Zone --project=$Project @sshExtra $localHelper "${Name}:chrysalis-gce-helpers/$helper"
  }
}
Remove-Item -LiteralPath $tarball -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $headSidecar -Force -ErrorAction SilentlyContinue

$skipFinish = if ($SkipHubFinish) { "1" } else { "0" }
$remote = @"
chmod +x ~/gce-test-vm-bootstrap.sh ~/gce-hub-finish-deploy.sh
export CHRYSALIS_REFRESH_ONLY=1 CHRYSALIS_TEST_USE_TARBALL=1 CHRYSALIS_AUTO_START_HUB=1 CHRYSALIS_DEPLOY_STRICT=1 CHRYSALIS_SKIP_HUB_FINISH=$skipFinish
~/gce-test-vm-bootstrap.sh
"@
Write-Host "Running refresh bootstrap (+ hub finish)..."
Invoke-ChrysalisGceSsh -Name $Name -Zone $Zone -Project $Project -Extra $sshExtra -Command $remote

# Bootstrap calls finish when SKIP_HUB_FINISH=0; legacy -StartStatusServer if finish skipped
if ($StartStatusServer -and $SkipHubFinish) {
  Invoke-ChrysalisGceSsh -Name $Name -Zone $Zone -Project $Project -Extra $sshExtra -Command "chmod +x ~/chrysalis-test/scripts/gce-chrysalis-status.sh && CHRYSALIS_STATUS_REPO=~/chrysalis-test bash ~/chrysalis-test/scripts/gce-chrysalis-status.sh"
}

$ip = (& gcloud compute instances describe $Name --zone=$Zone --project=$Project --format="get(networkInterfaces[0].accessConfigs[0].natIP)" 2>$null | Out-String).Trim()
Write-Host "Done. Chrysalis tree: ~/chrysalis-test on ${Name}"
if ($ip) { Write-Host "Hub: http://${ip}:19090/" }
