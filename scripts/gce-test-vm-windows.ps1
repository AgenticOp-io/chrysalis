<#
.SYNOPSIS
  Create or refresh a Windows Server GCE VM and run the Chrysalis cross-platform verify suite.

.EXAMPLE
  .\scripts\gce-test-vm-windows.ps1 -Project chrysalis-dev-f5x6qv -DeployFromLocalGit -Recreate

.EXAMPLE
  .\scripts\gce-test-vm-windows.ps1 -Project chrysalis-dev-f5x6qv -DeployFromLocalGit
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $Project,
  [string] $Zone = "us-central1-a",
  [string] $Name = "chrysalis-test-vm-win",
  [switch] $DeployFromLocalGit,
  [switch] $TunnelThroughIap,
  [switch] $Recreate,
  [switch] $SkipServicesEnable
)

$ErrorActionPreference = "Stop"
$env:CLOUDSDK_CORE_DISABLE_PROMPTS = "1"
$env:CLOUDSDK_COMPUTE_SSH_USE_OPENSSH = "True"
$repoRoot = Split-Path -Parent $PSScriptRoot
$bootstrap = Join-Path $PSScriptRoot "gce-test-vm-bootstrap-windows.ps1"
$tarball = $null

function Invoke-Gcloud {
  param([string[]] $GcloudArgs)
  & gcloud @GcloudArgs
  if ($LASTEXITCODE -ne 0) { throw "gcloud failed: gcloud $($GcloudArgs -join ' ')" }
}

if (-not (Test-Path $bootstrap)) { throw "Missing $bootstrap" }
if (-not $DeployFromLocalGit) {
  throw "-DeployFromLocalGit is required (private repo / no git on VM)."
}

Write-Host "Using project=$Project zone=$Zone instance=$Name (Windows Server 2022)"
Invoke-Gcloud -GcloudArgs @("config", "set", "project", $Project)

if (-not $SkipServicesEnable) {
  Invoke-Gcloud -GcloudArgs @("services", "enable", "compute.googleapis.com", "--project=$Project")
}

$prevEa = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
$null = gcloud compute instances describe $Name --zone=$Zone --project=$Project 2>&1
$instanceExists = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $prevEa

if ($instanceExists) {
  if ($Recreate) {
    Write-Host "Deleting existing instance $Name ..."
    Invoke-Gcloud -GcloudArgs @("compute", "instances", "delete", $Name, "--zone=$Zone", "--project=$Project", "--quiet")
  }
}
else {
  if (-not $Recreate) {
    Write-Host "Instance $Name not found; will create."
  }
}

$prevEa = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
$null = gcloud compute instances describe $Name --zone=$Zone --project=$Project 2>&1
$instanceExists = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $prevEa

if (-not $instanceExists) {
  Write-Host "Creating preemptible e2-standard-2 Windows VM (30GB disk, OS Login)..."
  $createArgs = @(
    "compute", "instances", "create", $Name,
    "--project=$Project",
    "--zone=$Zone",
    "--machine-type=e2-standard-2",
    "--preemptible",
    "--boot-disk-size=30GB",
    "--boot-disk-type=pd-balanced",
    "--image-family=windows-2022",
    "--image-project=windows-cloud",
    "--scopes=https://www.googleapis.com/auth/cloud-platform",
    "--metadata=enable-oslogin=TRUE"
  )
  Invoke-Gcloud -GcloudArgs $createArgs
}

$sshExtra = @()
if ($TunnelThroughIap) { $sshExtra = @("--tunnel-through-iap") }

Write-Host "Waiting for SSH (Windows can take several minutes)..."
$sshOk = $false
for ($i = 0; $i -lt 60; $i++) {
  $prevEa = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  $null = & gcloud compute ssh $Name --zone=$Zone --project=$Project @sshExtra --command="echo ok" 2>&1
  $ErrorActionPreference = $prevEa
  if ($LASTEXITCODE -eq 0) { $sshOk = $true; break }
  Start-Sleep -Seconds 10
  Write-Host "  retry $($i + 1)/60 ..."
}
if (-not $sshOk) { throw "SSH to Windows instance failed. Try -TunnelThroughIap." }

$dotGit = Join-Path $repoRoot ".git"
if (-not (Test-Path -LiteralPath $dotGit)) {
  throw "-DeployFromLocalGit requires a git checkout at $repoRoot"
}
$tarball = Join-Path $env:TEMP ("chrysalis-src-" + [guid]::NewGuid().ToString("n") + ".tar.gz")
Push-Location $repoRoot
try {
  Write-Host "Archiving local git HEAD..."
  & git archive --format=tar.gz -o $tarball HEAD
  if ($LASTEXITCODE -ne 0) { throw "git archive failed" }
}
finally {
  Pop-Location
}

Write-Host "Uploading bootstrap + tarball..."
Invoke-Gcloud -GcloudArgs @(
  "compute", "scp", "--zone=$Zone", "--project=$Project"
) + $sshExtra + @($bootstrap, "${Name}:gce-test-vm-bootstrap-windows.ps1")
Invoke-Gcloud -GcloudArgs @(
  "compute", "scp", "--zone=$Zone", "--project=$Project"
) + $sshExtra + @($tarball, "${Name}:chrysalis-src.tgz")

$remote = 'powershell -ExecutionPolicy Bypass -File $env:USERPROFILE\gce-test-vm-bootstrap-windows.ps1'
Write-Host "Running Windows bootstrap + verify suite (may take 15-30 min)..."
try {
  Invoke-Gcloud -GcloudArgs @(
    "compute", "ssh", $Name, "--zone=$Zone", "--project=$Project"
  ) + $sshExtra + @("--command", $remote)
}
finally {
  if ($tarball -and (Test-Path -LiteralPath $tarball)) {
    Remove-Item -LiteralPath $tarball -Force -ErrorAction SilentlyContinue
  }
}

Write-Host ""
Write-Host "Done. Windows verify suite passed on $Name"
Write-Host "  gcloud compute ssh $Name --zone=$Zone --project=$Project $(if ($TunnelThroughIap) { '--tunnel-through-iap' })"
