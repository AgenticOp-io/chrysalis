<#
.SYNOPSIS
  Install/update Caddy with Let's Encrypt for hub.agenticop.io (and optional wisp.agenticop.io).

.DESCRIPTION
  1. Ensure GCP firewall allows tcp:443 on the VM (see docs/AGENTICOP.md).
  2. Add DNS A records at your registrar BEFORE running (Let's Encrypt HTTP-01).
  3. Upload and run scripts/gce-hub-caddy-tls.sh on chrysalis-test-vm.

.EXAMPLE
  .\scripts\gce-hub-caddy-deploy.ps1 -Project chrysalis-dev-f5x6qv
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $Project,
  [string] $Zone = "us-central1-a",
  [string] $Name = "chrysalis-test-vm",
  [switch] $TunnelThroughIap
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$script = Join-Path $PSScriptRoot "gce-hub-caddy-tls.sh"
$gceTestVm = Join-Path $PSScriptRoot "gce-test-vm.ps1"

if (-not (Test-Path $gceTestVm)) { throw "missing $gceTestVm" }

$sshExtra = @()
if ($TunnelThroughIap) { $sshExtra += "--tunnel-through-iap" }

$remote = "~/chrysalis-gce-helpers/gce-hub-caddy-tls.sh"
Write-Host "Uploading gce-hub-caddy-tls.sh..."
& gcloud compute scp @sshExtra $script "${Name}:${remote}" --zone=$Zone --project=$Project
if ($LASTEXITCODE -ne 0) { throw "scp failed" }

Write-Host "Running Caddy TLS setup on VM (DNS must already point here)..."
$cmd = "chmod +x ${remote} && CHRYSALIS_CADDY_ACME_EMAIL=hello@agenticop.io bash ${remote}"
& gcloud compute ssh $Name @sshExtra --zone=$Zone --project=$Project --command=$cmd
if ($LASTEXITCODE -ne 0) { throw "caddy setup failed — verify DNS A records for hub.agenticop.io" }

Write-Host ""
Write-Host "=== Demo URLs (HTTPS) ==="
Write-Host "Hub:  https://hub.agenticop.io/"
Write-Host "WISP: https://wisp.agenticop.io/  (if :19100 is running)"
