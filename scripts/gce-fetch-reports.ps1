<#
.SYNOPSIS
  Download reports/ci from chrysalis-test-vm to local repo.
#>
param(
  [string] $Project = $(if ($env:CHRYSALIS_GCE_PROJECT) { $env:CHRYSALIS_GCE_PROJECT } else { "chrysalis-dev-f5x6qv" }),
  [string] $Zone = "us-central1-a",
  [string] $Name = "chrysalis-test-vm",
  [parameter(ValueFromRemainingArguments = $true)]
  [string[]] $SshExtra
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$localReports = Join-Path $repoRoot "reports\ci"
New-Item -ItemType Directory -Force -Path $localReports | Out-Null

$remote = "${Name}:chrysalis-test/reports/ci"
Write-Host "scp ${remote} -> ${localReports}"
& gcloud compute scp --recurse --zone=$Zone --project=$Project @SshExtra "${remote}/*" $localReports
if ($LASTEXITCODE -ne 0) {
  Write-Host "WARN: partial fetch (remote reports/ci may be empty until run completes)"
}
Write-Host "Done."
