<#
.SYNOPSIS
  Shared GCE instance protection — refuse delete/recreate of allowlisted VMs.

.DESCRIPTION
  Sourced by gce-*.ps1 before any `gcloud compute instances delete`.
  Catalog: fixtures/ci/gce-protected-instances.json
#>

function Get-ChrysalisGceProtectedCatalog {
  $root = Split-Path -Parent $PSScriptRoot
  $path = Join-Path $root "fixtures/ci/gce-protected-instances.json"
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Missing GCE protect catalog: $path"
  }
  return Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
}

function Get-ChrysalisGceDefaultInstance {
  if ($env:CHRYSALIS_GCE_INSTANCE -and $env:CHRYSALIS_GCE_INSTANCE.Trim()) {
    return $env:CHRYSALIS_GCE_INSTANCE.Trim()
  }
  $cat = Get-ChrysalisGceProtectedCatalog
  if ($cat.preferredChrysalisHost) { return [string]$cat.preferredChrysalisHost }
  return "agenticop-master"
}

function Assert-ChrysalisGceInstanceDeletable {
  param(
    [Parameter(Mandatory = $true)][string] $Name,
    [string] $Zone = "us-central1-a",
    [string] $Project = ""
  )
  $cat = Get-ChrysalisGceProtectedCatalog
  $names = @($cat.protectByName | ForEach-Object { [string]$_ })
  $ids = @($cat.protectById | ForEach-Object { [string]$_ })

  if ($names -contains $Name) {
    throw "Refusing to delete/recreate protected GCE instance '$Name' (fixtures/ci/gce-protected-instances.json). Deletion protection + do-not-delete label. Stop only with explicit operator ask."
  }

  $projArgs = @()
  if ($Project) { $projArgs = @("--project=$Project") }
  $prevEa = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  $desc = gcloud compute instances describe $Name --zone=$Zone @projArgs --format=json 2>$null
  $ErrorActionPreference = $prevEa
  if (-not $desc) { return }

  $obj = $desc | ConvertFrom-Json
  $id = [string]$obj.id
  if ($ids -contains $id) {
    throw "Refusing to delete/recreate protected GCE instance id=$id name=$Name (allowlist). Stop only with explicit operator ask."
  }
  if ($obj.deletionProtection -eq $true) {
    throw "Refusing to delete/recreate '$Name': GCP deletionProtection=true."
  }
  $labels = $obj.labels
  if ($labels -and $labels.'do-not-delete' -eq 'true') {
    throw "Refusing to delete/recreate '$Name': label do-not-delete=true."
  }
  if ($labels -and $labels.owner -eq 'agenticop-io' -and $cat.protectIfLabel.owner -eq 'agenticop-io') {
    throw "Refusing to delete/recreate '$Name': label owner=agenticop-io (protected)."
  }
}
