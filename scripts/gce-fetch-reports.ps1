<#
.SYNOPSIS
  Download reports/ci from chrysalis-test-vm to local repo.
#>
param(
  [string] $Project = $(if ($env:CHRYSALIS_GCE_PROJECT) { $env:CHRYSALIS_GCE_PROJECT } else { "chrysalis-dev-f5x6qv" }),
  [string] $Zone = "us-central1-a",
  [string] $Name = "",
  [switch] $OperatorHubs,
  [parameter(ValueFromRemainingArguments = $true)]
  [string[]] $SshExtra
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "gce-auth-activate.ps1") | Out-Null
. (Join-Path $PSScriptRoot "gce-protected-instances.ps1")
if (-not $Name) { $Name = Get-ChrysalisGceDefaultInstance }
$repoRoot = Split-Path -Parent $PSScriptRoot
$localReports = Join-Path $repoRoot "reports\ci"
New-Item -ItemType Directory -Force -Path $localReports | Out-Null

$remote = "${Name}:chrysalis-test/reports/ci"
Write-Host "scp ${remote} -> ${localReports}"
& gcloud compute scp --recurse --zone=$Zone --project=$Project @SshExtra "${remote}/*" $localReports
if ($LASTEXITCODE -ne 0) {
  Write-Host "WARN: partial fetch (remote reports/ci may be empty until run completes)"
}

# Always try LoRA adapter/summary from CPU VM (GPU train lands here after orchestrate fetch).
$loraLocal = Join-Path $repoRoot "reports\web-llm\lora"
New-Item -ItemType Directory -Force -Path $loraLocal | Out-Null
Write-Host "scp ${Name}:chrysalis-test/reports/web-llm/lora -> $loraLocal"
& gcloud compute scp --recurse --zone=$Zone --project=$Project @SshExtra "${Name}:chrysalis-test/reports/web-llm/lora/*" $loraLocal 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "WARN: no LoRA reports on CPU VM yet (adapter fetch runs after real train)"
}

$includeOperator =
  $OperatorHubs.IsPresent -or $env:CHRYSALIS_GCE_FETCH_OPERATOR_HUBS -eq "1"

if ($includeOperator) {
  $operatorPaths = @(
    @{ Remote = "chrysalis-test/reports/migration-evidence/poc"; Local = "reports\migration-evidence\poc" },
    @{ Remote = "chrysalis-test/reports/federation/poc"; Local = "reports\federation\poc" },
    @{ Remote = "chrysalis-test/reports/federation/league"; Local = "reports\federation\league" },
    @{ Remote = "chrysalis-test/reports/web-llm/shorthand/poc"; Local = "reports\web-llm\shorthand\poc" },
    @{ Remote = "chrysalis-test/reports/web-llm/poc"; Local = "reports\web-llm\poc" },
    @{ Remote = "chrysalis-test/reports/web-llm/lora"; Local = "reports\web-llm\lora" },
    @{ Remote = "chrysalis-test/reports/open-legacy-index/nightly"; Local = "reports\open-legacy-index\nightly" }
  )
  foreach ($entry in $operatorPaths) {
    $localDir = Join-Path $repoRoot $entry.Local
    New-Item -ItemType Directory -Force -Path $localDir | Out-Null
    $remotePath = "${Name}:$($entry.Remote)"
    Write-Host "scp ${remotePath} -> ${localDir}"
    & gcloud compute scp --recurse --zone=$Zone --project=$Project @SshExtra "${remotePath}/*" $localDir 2>$null
    if ($LASTEXITCODE -ne 0) {
      Write-Host "WARN: skip missing operator path $($entry.Remote)"
    }
  }
}

Write-Host "Done."
