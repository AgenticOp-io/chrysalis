<#
.SYNOPSIS
  Start (or create) a GCE VM and run WPTP matrix harness tests (npm ci, validate, verify:harness).

.EXAMPLE
  .\scripts\gce-wptp-test-vm.ps1 -Project chrysalis-dev-f5x6qv -UseExistingInstance

.EXAMPLE
  .\scripts\gce-wptp-test-vm.ps1 -Project chrysalis-dev-f5x6qv -Recreate
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $Project,
  [string] $Zone = "us-central1-a",
  [string] $Name = "chrysalis-test-vm",
  [string] $MatrixRepo = "https://github.com/theorem6/wptp-matrix.git",
  [string] $MatrixRef = "v0.1.9",
  [switch] $UseExistingInstance,
  [switch] $TunnelThroughIap,
  [switch] $Recreate,
  [switch] $SkipServicesEnable
)

$ErrorActionPreference = "Stop"
$env:CLOUDSDK_CORE_DISABLE_PROMPTS = "1"

function Invoke-Gcloud {
  param([string[]] $GcloudArgs)
  & gcloud @GcloudArgs
  if ($LASTEXITCODE -ne 0) { throw "gcloud failed: gcloud $($GcloudArgs -join ' ')" }
}

Write-Host "WPTP GCE test: project=$Project zone=$Zone instance=$Name ref=$MatrixRef"
Invoke-Gcloud -GcloudArgs @("config", "set", "project", $Project)

if (-not $SkipServicesEnable) {
  $enableOut = gcloud services enable compute.googleapis.com --project=$Project 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0 -and $enableOut -notmatch "already enabled") {
    throw "gcloud services enable failed: $enableOut"
  }
}

# Prefer OpenSSH on Windows (plink does not accept -o ServerAlive* flags).
if (-not $env:CLOUDSDK_COMPUTE_SSH_USE_OPENSSH) {
  $env:CLOUDSDK_COMPUTE_SSH_USE_OPENSSH = "True"
}
$sshExtra = @()
if ($TunnelThroughIap) { $sshExtra = @("--tunnel-through-iap") }

$prevEa = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
$null = gcloud compute instances describe $Name --zone=$Zone --project=$Project 2>&1
$instanceExists = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $prevEa

if ($instanceExists) {
  $status = gcloud compute instances describe $Name --zone=$Zone --project=$Project --format="value(status)"
  if ($Recreate) {
    Write-Host "Deleting existing instance $Name ..."
    Invoke-Gcloud -GcloudArgs @("compute", "instances", "delete", $Name, "--zone=$Zone", "--project=$Project", "--quiet")
    $instanceExists = $false
  }
  elseif ($status -eq "TERMINATED") {
    Write-Host "Starting stopped instance $Name ..."
    Invoke-Gcloud -GcloudArgs @("compute", "instances", "start", $Name, "--zone=$Zone", "--project=$Project")
  }
  elseif ($status -ne "RUNNING" -and -not $UseExistingInstance) {
    throw "Instance $Name status=$status. Pass -UseExistingInstance or -Recreate."
  }
}

if (-not $instanceExists) {
  Write-Host "Creating e2-small VM (2 GiB RAM for npm ci + harness) ..."
  Invoke-Gcloud -GcloudArgs @(
    "compute", "instances", "create", $Name,
    "--project=$Project", "--zone=$Zone",
    "--machine-type=e2-small",
    "--boot-disk-size=30GB", "--boot-disk-type=pd-balanced",
    "--image-family=debian-12", "--image-project=debian-cloud",
    "--scopes=https://www.googleapis.com/auth/cloud-platform",
    "--metadata=enable-oslogin=TRUE"
  )
}

Write-Host "Waiting for SSH..."
$sshOk = $false
for ($i = 0; $i -lt 36; $i++) {
  $prevEa = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  $null = & gcloud compute ssh $Name --zone=$Zone --project=$Project @sshExtra --command="echo ok" 2>&1
  $ErrorActionPreference = $prevEa
  if ($LASTEXITCODE -eq 0) { $sshOk = $true; break }
  Start-Sleep -Seconds 5
  Write-Host "  retry $($i+1)/36 ..."
}
if (-not $sshOk) { throw "SSH failed. Try -TunnelThroughIap." }

$bootstrap = Join-Path $PSScriptRoot "gce-wptp-test-bootstrap.sh"
if (-not (Test-Path $bootstrap)) { throw "Missing $bootstrap" }

Write-Host "Uploading WPTP bootstrap ..."
$scpArgs = @("compute", "scp", "--zone=$Zone", "--project=$Project") + $sshExtra + @($bootstrap, "${Name}:gce-wptp-test-bootstrap.sh")
Invoke-Gcloud -GcloudArgs $scpArgs

function BashSingleQuote([string] $s) { return "'" + ($s -replace "'", "'\''") + "'" }
$qRepo = BashSingleQuote $MatrixRepo
$qRef = BashSingleQuote $MatrixRef
$remote = "chmod +x ~/gce-wptp-test-bootstrap.sh && export WPTP_MATRIX_REPO=$qRepo WPTP_MATRIX_REF=$qRef && ~/gce-wptp-test-bootstrap.sh"
Write-Host "Running WPTP harness on VM (npm ci + harness; often 15-25 min on e2-small) ..."
$sshCmdArgs = @("compute", "ssh", $Name, "--zone=$Zone", "--project=$Project") + $sshExtra + @("--command", $remote)
Invoke-Gcloud -GcloudArgs $sshCmdArgs

Write-Host ""
Write-Host "Done. WPTP matrix passed on $Name."
Write-Host "  gcloud compute ssh $Name --zone=$Zone --project=$Project $(if ($TunnelThroughIap) { '--tunnel-through-iap' })"
Write-Host "  cd ~/wptp-src/wptp-matrix"
