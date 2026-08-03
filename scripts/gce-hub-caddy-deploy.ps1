<#
.SYNOPSIS
  Install/update nginx + Let's Encrypt for hub.agenticop.io / chrysalis.agenticop.io (DESIGN D6396).

.DESCRIPTION
  1. Ensure GCP firewall allows tcp:443 on the VM (see docs/AGENTICOP.md / HUB-DEMO-INSTALL.md).
  2. Add DNS A records BEFORE running (Let's Encrypt HTTP-01 webroot).
  3. Upload and run scripts/gce-hub-nginx-tls.sh on chrysalis-test-vm.
  Does NOT modify FDE nginx sites (fragility-default-ip, fragility-public) or port 8765.

.EXAMPLE
  .\scripts\gce-hub-caddy-deploy.ps1 -Project chrysalis-dev-f5x6qv
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $Project,
  [string] $Zone = "us-central1-a",
  [string] $Name = "",
  [switch] $TunnelThroughIap
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "gce-protected-instances.ps1")
if (-not $Name) { $Name = Get-ChrysalisGceDefaultInstance }
$repoRoot = Split-Path -Parent $PSScriptRoot
$script = Join-Path $PSScriptRoot "gce-hub-nginx-tls.sh"
$example = Join-Path $repoRoot "docs/nginx/chrysalis-hub.vhost.example"
$gceTestVm = Join-Path $PSScriptRoot "gce-test-vm.ps1"

if (-not (Test-Path $gceTestVm)) { throw "missing $gceTestVm" }

$sshExtra = @()
if ($TunnelThroughIap) { $sshExtra += "--tunnel-through-iap" }

$remoteDir = "chrysalis-gce-helpers"
$remote = "${remoteDir}/gce-hub-nginx-tls.sh"
Write-Host "Uploading gce-hub-nginx-tls.sh (+ vhost example)..."
& gcloud compute ssh $Name @sshExtra --zone=$Zone --project=$Project --command="mkdir -p ~/${remoteDir} ~/chrysalis-test/docs/nginx"
if ($LASTEXITCODE -ne 0) { throw "ssh mkdir failed" }
& gcloud compute scp @sshExtra $script "${Name}:${remote}" --zone=$Zone --project=$Project
if ($LASTEXITCODE -ne 0) { throw "scp failed" }
if (Test-Path $example) {
  & gcloud compute scp @sshExtra $example "${Name}:chrysalis-test/docs/nginx/chrysalis-hub.vhost.example" --zone=$Zone --project=$Project
  if ($LASTEXITCODE -ne 0) { throw "scp failed for vhost example" }
}

Write-Host "Running nginx + certbot TLS on VM (DNS must already point here)..."
$cmd = "chmod +x ~/${remote} && CHRYSALIS_HUB_ACME_EMAIL=admin@agenticop.io bash ~/${remote}"
& gcloud compute ssh $Name @sshExtra --zone=$Zone --project=$Project --command=$cmd
if ($LASTEXITCODE -ne 0) { throw "nginx TLS setup failed - verify DNS A records for hub.agenticop.io and chrysalis.agenticop.io" }

Write-Host ""
Write-Host "=== Demo URLs (HTTPS) ==="
Write-Host "Chrysalis: https://chrysalis.agenticop.io/"
Write-Host "Alias:     https://hub.agenticop.io/"
Write-Host "Direct IP: http://34.61.255.147:19090/  (optional; close tcp:19090 after bind 127.0.0.1)"
Write-Host "Docs:      docs/HUB-DEMO-INSTALL.md | docs/nginx/chrysalis-hub.vhost.example (D6396)"
