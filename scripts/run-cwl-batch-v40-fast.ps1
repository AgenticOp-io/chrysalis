#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Run hub-cwl-authoring-batch-v40-smoke with fast chain + suppressed Node SQLite warning.

.EXAMPLE
  .\scripts\run-cwl-batch-v40-fast.ps1
  .\scripts\run-cwl-batch-v40-fast.ps1 -Log reports/ci/hub-cwl-batch-v40-fast2.log
#>
param(
  [string] $Log = "reports/ci/hub-cwl-batch-v40-fast2.log"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot
New-Item -ItemType Directory -Force -Path (Split-Path $Log) | Out-Null

$env:NODE_OPTIONS = "--disable-warning=ExperimentalWarning"
$env:CHRYSALIS_HUB_CWL_BATCH_FAST_CHAIN = "1"

Write-Host "Log: $Log (fast chain, SQLite warning suppressed)"
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& node scripts/hub-ingest/hub-cwl-authoring-batch-v40-smoke.mjs *> $Log
$code = $LASTEXITCODE
$ErrorActionPreference = $prevEap
Pop-Location

if ($code -ne 0) {
  Write-Host "FAILED exit=$code (see $Log)"
  Get-Content $Log -Tail 40
  exit $code
}

$tail = Get-Content $Log -Raw
if ($tail -notmatch '"ok"\s*:\s*true') {
  Write-Host "FAILED: no ok:true in log (see $Log)"
  Get-Content $Log -Tail 40
  exit 1
}

Write-Host "OK batch v40 fast chain"
Get-Content $Log -Tail 8
exit 0
