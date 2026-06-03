<#
.SYNOPSIS
  Poll GCE test run until OK or failure; optionally fetch reports and re-launch.

.EXAMPLE
  .\scripts\gce-wait-for-gce.ps1
  .\scripts\gce-wait-for-gce.ps1 -IntervalSec 120 -OnSuccess fetch
  .\scripts\gce-wait-for-gce.ps1 -OnFailure relaunch
#>
param(
  [string] $Project = $(if ($env:CHRYSALIS_GCE_PROJECT) { $env:CHRYSALIS_GCE_PROJECT } else { "chrysalis-dev-f5x6qv" }),
  [string] $Zone = "us-central1-a",
  [string] $Name = "chrysalis-test-vm",
  [int] $IntervalSec = 90,
  [ValidateSet("none", "fetch", "relaunch")]
  [string] $OnSuccess = "fetch",
  [ValidateSet("none", "relaunch")]
  [string] $OnFailure = "none",
  [parameter(ValueFromRemainingArguments = $true)]
  [string[]] $SshExtra
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$statusScript = Join-Path $PSScriptRoot "gce-test-status.ps1"
$fetchScript = Join-Path $PSScriptRoot "gce-fetch-reports.ps1"
$runScript = Join-Path $PSScriptRoot "gce-run-all-tests.ps1"

function Get-RemoteGceState {
  param([string[]] $Extra)
  $remote = @'
if test -f ~/chrysalis-test/reports/ci/gce-all-tests.ok; then echo OK; else echo PENDING; fi
if test -f ~/.chrysalis-gce-test.pid && kill -0 $(cat ~/.chrysalis-gce-test.pid) 2>/dev/null; then echo ALIVE; else echo DEAD; fi
'@
  $out = & gcloud compute ssh $Name --zone=$Zone --project=$Project @Extra --command=$remote 2>&1
  if ($LASTEXITCODE -ne 0) { throw "gcloud ssh failed: $out" }
  $lines = $out -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ }
  [pscustomobject]@{
    OkMarker = ($lines -contains "OK")
    Alive    = ($lines -contains "ALIVE")
  }
}

Write-Host "Polling GCE every ${IntervalSec}s (Ctrl+C to stop)..."
while ($true) {
  & $statusScript -Project $Project -Zone $Zone -Name $Name @SshExtra
  $state = Get-RemoteGceState -Extra $SshExtra
  if ($state.OkMarker) {
    Write-Host "`n=== GCE ALL OK ==="
    if ($OnSuccess -eq "fetch") {
      & $fetchScript -Project $Project -Zone $Zone -Name $Name @SshExtra
    }
    exit 0
  }
  if (-not $state.Alive) {
    Write-Host "`n=== GCE FAILED (process dead, no ok marker) ==="
    if ($OnFailure -eq "relaunch") {
      Write-Host "Relaunching detached run..."
      & $runScript -Project $Project -Zone $Zone -Name $Name -Detach @SshExtra
    }
    exit 1
  }
  Start-Sleep -Seconds $IntervalSec
}
