<#
.SYNOPSIS
  Create a cheap preemptible e2-micro GCE VM and deploy Chrysalis via git clone or local git archive + bootstrap (SSH).

.DESCRIPTION
  Requires: gcloud CLI, interactive `gcloud auth login` as david@agenticop.io, a GCP project
  with billing + permission to enable Compute and create VMs.

  In ad-hoc PowerShell one-liners, do not use `$pid` as a variable name for the project id:
  `$PID` is automatic (current process id) and breaks `gcloud --project=...`.

.PARAMETER Project
  GCP project id (required).

.PARAMETER Zone
  Zone for the VM (default us-central1-a).

.PARAMETER Name
  Instance name (default chrysalis-test-vm).

.PARAMETER RepoUrl
  Git clone URL when not using -DeployFromLocalGit (ignored when tarball is used).

.PARAMETER Branch
  Git branch to clone when not using -DeployFromLocalGit (ignored when tarball is used).

.PARAMETER DeployFromLocalGit
  After `git archive` of HEAD from the repo root (parent of `scripts/`), upload `chrysalis-src.tgz` and set
  CHRYSALIS_TEST_USE_TARBALL=1 so the VM does not need GitHub credentials (use for private repos).

.PARAMETER TunnelThroughIap
  Use IAP TCP forwarding for SSH/SCP if the VM has no usable external path to :22.

.PARAMETER Recreate
  If the instance already exists, delete it first then create.

.PARAMETER SkipServicesEnable
  Do not run `gcloud services enable compute.googleapis.com`. Use when the API is already enabled and your role cannot call services.enable.

.PARAMETER BillingAccountId
  If set and the project has no billing account, run `gcloud billing projects link` before enabling Compute.
  Use the id from `gcloud billing accounts list` (e.g. 01ABCD-12EFGH-34IJKL). Omit when billing is already linked.

.EXAMPLE
  .\scripts\gce-test-vm.ps1 -Project chrysalis-dev-f5x6qv -Recreate -DeployFromLocalGit

.EXAMPLE
  .\scripts\gce-test-vm.ps1 -Project chrysalis-dev-f5x6qv -Recreate

.EXAMPLE
  .\scripts\gce-test-vm.ps1 -Project my-proj -BillingAccountId 01ABCD-12EFGH-34IJKL
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $Project,
  [string] $Zone = "us-central1-a",
  [string] $Name = "chrysalis-test-vm",
  [string] $RepoUrl = "https://github.com/theorem6/chrysalis.git",
  [string] $Branch = "main",
  [string] $BillingAccountId = "",
  [switch] $DeployFromLocalGit,
  [switch] $TunnelThroughIap,
  [switch] $Recreate,
  [switch] $SkipServicesEnable
)

$ErrorActionPreference = "Stop"
$env:CLOUDSDK_CORE_DISABLE_PROMPTS = "1"
$repoRoot = Split-Path -Parent $PSScriptRoot
$tarball = $null
. (Join-Path $PSScriptRoot "gce-protected-instances.ps1")

function Invoke-Gcloud {
  param([string[]] $GcloudArgs)
  & gcloud @GcloudArgs
  if ($LASTEXITCODE -ne 0) { throw "gcloud failed: gcloud $($GcloudArgs -join ' ')" }
}

Write-Host "Using project=$Project zone=$Zone instance=$Name"
Invoke-Gcloud -GcloudArgs @("config", "set", "project", $Project)

if ($BillingAccountId) {
  $billingEnabled = gcloud billing projects describe $Project --format="value(billingEnabled)" 2>$null
  if ($LASTEXITCODE -eq 0 -and $billingEnabled -ne "True") {
    Write-Host "Linking billing account $BillingAccountId to project $Project ..."
    Invoke-Gcloud -GcloudArgs @("billing", "projects", "link", $Project, "--billing-account=$BillingAccountId")
  }
}

if (-not $SkipServicesEnable) {
  $enableOut = gcloud services enable compute.googleapis.com --project=$Project 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) {
    if ($enableOut -match "UREQ_PROJECT_BILLING_NOT_FOUND|billing-enabled") {
      throw "Compute API could not be enabled: attach a billing account to project '$Project' in Google Cloud Console, then retry. Or use -SkipServicesEnable if Compute is already enabled on this project. Raw: $enableOut"
    }
    throw "gcloud services enable failed: $enableOut"
  }
}
else {
  Write-Host "Skipping compute.googleapis.com enable (-SkipServicesEnable)."
}

$prevEa = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
$null = gcloud compute instances describe $Name --zone=$Zone --project=$Project 2>&1
$instanceExists = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $prevEa
if ($instanceExists) {
  if ($Recreate) {
    Assert-ChrysalisGceInstanceDeletable -Name $Name -Zone $Zone -Project $Project
    Write-Host "Deleting existing instance $Name ..."
    Invoke-Gcloud -GcloudArgs @("compute", "instances", "delete", $Name, "--zone=$Zone", "--project=$Project", "--quiet")
  }
  else {
    throw "Instance '$Name' already exists in $Zone. Pass -Recreate to replace it."
  }
}

Write-Host "Creating preemptible e2-micro VM (Debian 12, 30GB disk, OS Login)..."
$createArgs = @(
  "compute", "instances", "create", $Name,
  "--project=$Project",
  "--zone=$Zone",
  "--machine-type=e2-micro",
  "--preemptible",
  "--boot-disk-size=30GB",
  "--boot-disk-type=pd-balanced",
  "--image-family=debian-12",
  "--image-project=debian-cloud",
  "--scopes=https://www.googleapis.com/auth/cloud-platform",
  "--metadata=enable-oslogin=TRUE"
)
Invoke-Gcloud -GcloudArgs $createArgs

Write-Host "Waiting for SSH..."
$sshExtra = @()
if ($TunnelThroughIap) {
  $sshExtra = @("--tunnel-through-iap")
}

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
if (-not $sshOk) { throw "SSH to new instance failed. Try -TunnelThroughIap or check firewall / VPC." }

$bootstrap = Join-Path $PSScriptRoot "gce-test-vm-bootstrap.sh"
if (-not (Test-Path $bootstrap)) { throw "Missing $bootstrap" }

Write-Host "Uploading bootstrap script..."
$scpArgs = @("compute", "scp", "--zone=$Zone", "--project=$Project") + $sshExtra + @($bootstrap, "${Name}:gce-test-vm-bootstrap.sh")
Invoke-Gcloud -GcloudArgs $scpArgs

if ($DeployFromLocalGit) {
  $dotGit = Join-Path $repoRoot ".git"
  if (-not (Test-Path -LiteralPath $dotGit)) {
    throw "-DeployFromLocalGit requires a git checkout at $repoRoot (missing .git)."
  }
  $tarball = Join-Path ([System.IO.Path]::GetTempPath()) ("chrysalis-src-" + [System.Guid]::NewGuid().ToString("n") + ".tar.gz")
  Push-Location $repoRoot
  try {
    Write-Host "Archiving local git HEAD to $tarball ..."
    & git archive --format=tar.gz -o $tarball HEAD
    if ($LASTEXITCODE -ne 0) { throw "git archive failed (cwd=$repoRoot)" }
  }
  finally {
    Pop-Location
  }
  Write-Host "Uploading source tarball..."
  $tarScp = @("compute", "scp", "--zone=$Zone", "--project=$Project") + $sshExtra + @($tarball, "${Name}:chrysalis-src.tgz")
  Invoke-Gcloud -GcloudArgs $tarScp
}

function BashSingleQuote([string] $s) {
  return "'" + ($s -replace "'", "'\''") + "'"
}
$qUrl = BashSingleQuote $RepoUrl
$qBranch = BashSingleQuote $Branch
$exportTar = if ($DeployFromLocalGit) { "CHRYSALIS_TEST_USE_TARBALL=1 " } else { "" }
$remote = "chmod +x ~/gce-test-vm-bootstrap.sh && export ${exportTar}CHRYSALIS_TEST_REPO_URL=$qUrl CHRYSALIS_TEST_BRANCH=$qBranch && ~/gce-test-vm-bootstrap.sh"
Write-Host "Running bootstrap on VM (install, clone or extract, build, test:cli-shims)..."
$sshCmdArgs = @("compute", "ssh", $Name, "--zone=$Zone", "--project=$Project") + $sshExtra + @("--command", $remote)
try {
  Invoke-Gcloud -GcloudArgs $sshCmdArgs
}
finally {
  if ($null -ne $tarball -and (Test-Path -LiteralPath $tarball)) {
    Remove-Item -LiteralPath $tarball -Force -ErrorAction SilentlyContinue
  }
}

Write-Host ""
Write-Host "Done. SSH in with:"
Write-Host "  gcloud compute ssh $Name --zone=$Zone --project=$Project $(if ($TunnelThroughIap) { '--tunnel-through-iap' })"
Write-Host "Repo on VM: ~/chrysalis-test"
