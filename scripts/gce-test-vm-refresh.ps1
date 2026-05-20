<#
.SYNOPSIS
  Refresh ~/chrysalis-test on an existing VM without apt/node churn (shared-VM safe).

.DESCRIPTION
  Uploads local git HEAD tarball + bootstrap with CHRYSALIS_REFRESH_ONLY=1 so apt-get
  and global Node setup are skipped. Does not touch other home directories or services.

.EXAMPLE
  .\scripts\gce-test-vm-refresh.ps1 -Project chrysalis-dev-f5x6qv
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $Project,
  [string] $Zone = "us-central1-a",
  [string] $Name = "chrysalis-test-vm",
  [switch] $TunnelThroughIap,
  [switch] $StartStatusServer
)

$ErrorActionPreference = "Stop"
$env:CLOUDSDK_CORE_DISABLE_PROMPTS = "1"
$env:CLOUDSDK_COMPUTE_SSH_USE_OPENSSH = "True"
$repoRoot = Split-Path -Parent $PSScriptRoot
$bootstrap = Join-Path $PSScriptRoot "gce-test-vm-bootstrap.sh"
$tarball = Join-Path $env:TEMP ("chrysalis-src-" + [guid]::NewGuid().ToString("n") + ".tar.gz")
$sshExtra = @()
if ($TunnelThroughIap) { $sshExtra = @("--tunnel-through-iap") }

Push-Location $repoRoot
try {
  Write-Host "Archiving local HEAD..."
  & git archive --format=tar.gz -o $tarball HEAD
  if ($LASTEXITCODE -ne 0) { throw "git archive failed" }
}
finally {
  Pop-Location
}

Write-Host "Uploading to ${Name} (refresh-only, ~/chrysalis-test only)..."
& gcloud compute scp --zone=$Zone --project=$Project @sshExtra $bootstrap "${Name}:gce-test-vm-bootstrap.sh"
& gcloud compute scp --zone=$Zone --project=$Project @sshExtra $tarball "${Name}:chrysalis-src.tgz"
Remove-Item -LiteralPath $tarball -Force -ErrorAction SilentlyContinue

$remote = @"
chmod +x ~/gce-test-vm-bootstrap.sh && export CHRYSALIS_REFRESH_ONLY=1 CHRYSALIS_TEST_USE_TARBALL=1 && ~/gce-test-vm-bootstrap.sh
"@
Write-Host "Running refresh bootstrap..."
& gcloud compute ssh $Name --zone=$Zone --project=$Project @sshExtra --command=$remote

if ($StartStatusServer) {
  & gcloud compute ssh $Name --zone=$Zone --project=$Project @sshExtra --command="chmod +x ~/chrysalis-test/scripts/gce-chrysalis-status.sh && CHRYSALIS_STATUS_REPO=~/chrysalis-test bash ~/chrysalis-test/scripts/gce-chrysalis-status.sh"
}

Write-Host "Done. Chrysalis tree: ~/chrysalis-test on ${Name}"
