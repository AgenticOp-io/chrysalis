<#
.SYNOPSIS
  Try each GCP project you can list until Compute can be enabled and a test VM is created + bootstrapped.

.DESCRIPTION
  Run from an interactive PowerShell after `gcloud auth login` (same session the agent may not use).

.PARAMETER Zone
  Zone for the VM (default us-central1-a).

.PARAMETER TunnelThroughIap
  Forward to gce-test-vm.ps1 when a project is chosen.

.EXAMPLE
  .\scripts\gce-test-vm-auto.ps1
#>
param(
  [string] $Zone = "us-central1-a",
  [switch] $TunnelThroughIap
)

$ErrorActionPreference = "Stop"
$env:CLOUDSDK_CORE_DISABLE_PROMPTS = "1"
$root = Split-Path -Parent $PSScriptRoot
$vmScript = Join-Path $PSScriptRoot "gce-test-vm.ps1"

$raw = gcloud projects list --format="value(projectId)" 2>&1
if ($LASTEXITCODE -ne 0) {
  throw "gcloud projects list failed. Run in this same window: gcloud auth login`n$($raw | Out-String)"
}
$projects = @($raw | Where-Object { $_ -match "^[a-z][a-z0-9-]{4,62}$" })
if ($projects.Count -eq 0) {
  throw "No project IDs parsed from gcloud projects list."
}

function SanitizeVmName([string] $projectId) {
  $s = $projectId.ToLower() -replace "[^a-z0-9-]", "-"
  $prefix = "ct-"
  $max = 63 - $prefix.Length
  if ($s.Length -gt $max) { $s = $s.Substring(0, $max).TrimEnd("-") }
  if ($s -match "^[0-9-]") { $s = "p" + $s }
  return ($prefix + $s).TrimEnd("-")
}

foreach ($p in $projects) {
  if ([string]::IsNullOrWhiteSpace($p)) { continue }
  Write-Host "`n--- Trying project: $p ---"
  $enableErr = gcloud services enable compute.googleapis.com --project=$p 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) {
    Write-Host "  skip enable compute: $($enableErr.Trim())"
    continue
  }

  $listOut = gcloud compute instances list --project=$p --limit=1 --format="value(name)" 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) {
    if ($listOut -match "PERMISSION_DENIED|SERVICE_DISABLED|not enabled|Billing") {
      Write-Host "  skip list: $($listOut.Trim().Substring(0, [Math]::Min(200, $listOut.Trim().Length)))"
      continue
    }
  }

  $vmName = SanitizeVmName $p
  Write-Host "  Using VM name: $vmName"
  try {
    & $vmScript -Project $p -Zone $Zone -Name $vmName -Recreate -TunnelThroughIap:$TunnelThroughIap
    Write-Host "`nSuccess on project: $p"
    exit 0
  }
  catch {
    Write-Host "  gce-test-vm.ps1 failed: $($_.Exception.Message)"
  }
}

throw "No project succeeded. Enable billing + Compute on at least one project, or grant compute.instanceAdmin / Editor."
