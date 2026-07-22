<#
.SYNOPSIS
  Deploy the hub.agenticop.io demo launcher (project directory) to chrysalis-test-vm.

.EXAMPLE
  .\scripts\gce-deploy-hub-projects-directory.ps1 -Project chrysalis-dev-f5x6qv
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $Project,
  [string] $Zone = "us-central1-a",
  [string] $Name = "chrysalis-test-vm"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$index = Join-Path $PSScriptRoot "hub-brand\hub-projects-index.html"
$css = Join-Path $PSScriptRoot "hub-brand\hub-projects-agenticops.css"
$logoCandidates = @(
  (Join-Path $PSScriptRoot "hub-brand\assets\logo.svg"),
  (Join-Path $repoRoot "scripts\hub-brand\assets\logo.svg"),
  (Join-Path $repoRoot "branding\agenticop\logo.svg")
)
$logo = $logoCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not (Test-Path $index)) { throw "Missing $index" }

Write-Host "Uploading demo launcher to ${Name}..."
& gcloud compute scp --zone=$Zone --project=$Project $index "${Name}:hub-projects-index.html"
if ($LASTEXITCODE -ne 0) { throw "scp index failed" }

$remoteCss = ""
if (Test-Path $css) {
  & gcloud compute scp --zone=$Zone --project=$Project $css "${Name}:hub-projects-agenticops.css"
  if ($LASTEXITCODE -ne 0) { throw "scp css failed" }
  $remoteCss = "sudo cp -f ~/hub-projects-agenticops.css /var/www/chrysalis/projects/agenticops.css && "
}
$remoteLogo = ""
if ($logo) {
  & gcloud compute scp --zone=$Zone --project=$Project $logo "${Name}:hub-projects-logo.svg"
  if ($LASTEXITCODE -ne 0) { throw "scp logo failed" }
  $remoteLogo = "sudo cp -f ~/hub-projects-logo.svg /var/www/chrysalis/projects/logo.svg && "
}

$cmd = @"
sudo mkdir -p /var/www/chrysalis/projects &&
sudo cp -f ~/hub-projects-index.html /var/www/chrysalis/projects/index.html &&
$remoteCss$remoteLogo
sudo chmod 644 /var/www/chrysalis/projects/index.html /var/www/chrysalis/projects/agenticops.css /var/www/chrysalis/projects/logo.svg 2>/dev/null || true
"@

& gcloud compute ssh --zone=$Zone --project=$Project $Name --command=$cmd
if ($LASTEXITCODE -ne 0) { throw "remote install failed" }

Write-Host ""
Write-Host "=== Demo launcher deployed ==="
Write-Host "https://hub.agenticop.io/"
