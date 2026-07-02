<#
.SYNOPSIS
  Prepare BigQuery dataset for Cloud Billing export (Console step still required once).

.DESCRIPTION
  Google does not expose a public API to toggle billing export — this script automates
  prerequisites (APIs, dataset) and prints the one-click Console URL to enable export.

.EXAMPLE
  pnpm run billing:export-setup
#>
param(
  [string] $Project = $(if ($env:CHRYSALIS_GCE_PROJECT) { $env:CHRYSALIS_GCE_PROJECT } else { "chrysalis-dev-f5x6qv" }),
  [string] $BillingAccount = "01EA2A-7E22D6-7B7AAF",
  [string] $Dataset = "billing_export",
  [string] $Location = "US"
)

$ErrorActionPreference = "Stop"
$env:CLOUDSDK_CORE_DISABLE_PROMPTS = "1"
$repoRoot = Split-Path -Parent $PSScriptRoot

# Billing export requires user OAuth (Billing Account Administrator).
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
gcloud config set account david@agenticop.io 2>&1 | Out-Null
$ErrorActionPreference = $prevEap

Write-Host "[billing-export-setup] project=$Project dataset=$Dataset location=$Location"

$apis = @("bigquery.googleapis.com", "bigquerydatatransfer.googleapis.com")
foreach ($api in $apis) {
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & gcloud services enable $api --project=$Project 2>&1 | Out-Null
  $ErrorActionPreference = $prevEap
  if ($LASTEXITCODE -ne 0) { throw "Failed to enable $api" }
  Write-Host "[billing-export-setup] enabled $api"
}

$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$exists = bq ls --project_id=$Project $Dataset 2>&1
$existsExit = $LASTEXITCODE
$ErrorActionPreference = $prevEap

if ($existsExit -ne 0) {
  bq mk --dataset --location=$Location "${Project}:${Dataset}"
  if ($LASTEXITCODE -ne 0) { throw "bq mk dataset failed" }
  Write-Host "[billing-export-setup] created dataset ${Project}:${Dataset}"
} else {
  Write-Host "[billing-export-setup] dataset already exists: ${Project}:${Dataset}"
}

$billingUnderscore = $BillingAccount -replace "-", "_"
$tableGuess = "gcp_billing_export_v1_${billingUnderscore}"
$consoleUrl = "https://console.cloud.google.com/billing/${BillingAccount}/export/bigquery?project=${Project}"

Write-Host ""
Write-Host "=== Manual step (once) ==="
Write-Host "Open: $consoleUrl"
Write-Host "Enable: Standard usage cost export"
Write-Host "Project: $Project"
Write-Host "Dataset: $Dataset"
Write-Host "Expected table (after ~24h): ${Project}.${Dataset}.${tableGuess}"
Write-Host ""
Write-Host "Then run: pnpm run billing:report"

# Check if export already active
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$tables = bq ls --project_id=$Project --max_results=50 "${Project}:${Dataset}" 2>&1
$tablesExit = $LASTEXITCODE
$ErrorActionPreference = $prevEap

if ($tablesExit -eq 0 -and ($tables -match "gcp_billing_export")) {
  Write-Host "[billing-export-setup] export table(s) already present in dataset"
  exit 0
}

Write-Host "[billing-export-setup] export not detected yet - complete Console enable above"
exit 0
