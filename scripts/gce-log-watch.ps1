<#
.SYNOPSIS
  Tail the local GCE watch log (default last 30 lines).
#>
param(
  [string] $LogPath = "",
  [int] $Tail = 30,
  [switch] $Follow
)

$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $LogPath) { $LogPath = Join-Path (Split-Path -Parent $scriptDir) "reports/ci/gce-watch.log" }

if (-not (Test-Path $LogPath)) {
  Write-Host "No watch log yet: $LogPath"
  Write-Host "Start: pnpm run test:gce:watch:detach"
  exit 1
}

if ($Follow) {
  Get-Content -Path $LogPath -Tail $Tail -Wait
} else {
  Get-Content -Path $LogPath -Tail $Tail
}
