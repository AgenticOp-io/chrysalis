<#
.SYNOPSIS
  Create a GCP service account JSON key so gcloud (and agents) can run without browser login.

.DESCRIPTION
  Run interactively after `gcloud auth login` with a user that can create service accounts and
  bind IAM on the target project. The JSON key is written to a path under the repo (gitignored).

  Enable the Compute Engine API on the project once (Console or: gcloud services enable compute.googleapis.com).

.PARAMETER Project
  GCP project id (required).

.PARAMETER ServiceAccountId
  Service account id (local part of the email). Default: chrysalis-vm-agent

.PARAMETER KeyFile
  Output path for the JSON key, relative to repo root unless absolute. Default: .chrysalis-gcp-sa-key.json

.PARAMETER PrintAccessToken
  After creating the key, activate the service account and print a one-line OAuth access token (expires ~1h).

.EXAMPLE
  .\scripts\create-gcp-vm-service-account.ps1 -Project agenticop-io

.EXAMPLE
  .\scripts\create-gcp-vm-service-account.ps1 -Project agenticop-io -PrintAccessToken
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $Project,
  [string] $ServiceAccountId = "chrysalis-vm-agent",
  [string] $KeyFile = ".chrysalis-gcp-sa-key.json",
  [switch] $PrintAccessToken
)

$ErrorActionPreference = "Stop"
$env:CLOUDSDK_CORE_DISABLE_PROMPTS = "1"

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not [System.IO.Path]::IsPathRooted($KeyFile)) {
  $KeyFile = Join-Path $repoRoot $KeyFile
}

function Invoke-Gcloud {
  param([string[]] $GcloudArgs)
  & gcloud @GcloudArgs
  if ($LASTEXITCODE -ne 0) { throw "gcloud failed: gcloud $($GcloudArgs -join ' ')" }
}

$email = "${ServiceAccountId}@${Project}.iam.gserviceaccount.com"

Write-Host "Project: $Project"
Write-Host "Service account: $email"

$createOut = gcloud iam service-accounts create $ServiceAccountId `
  --display-name="Chrysalis VM / gcloud token" `
  --project=$Project 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) {
  if ($createOut -match "already exists|Already exists") {
    Write-Host "Service account already exists; continuing."
  }
  else {
    throw $createOut
  }
}
else {
  Write-Host "Created service account."
}

Write-Host "Binding roles/compute.instanceAdmin.v1 (create/delete VMs, SSH metadata keys)..."
Invoke-Gcloud @(
  "projects", "add-iam-policy-binding", $Project,
  "--member=serviceAccount:$email",
  "--role=roles/compute.instanceAdmin.v1"
)

Write-Host "Writing key file (keep secret; never commit): $KeyFile"
if (Test-Path $KeyFile) {
  throw "Refusing to overwrite existing key file: $KeyFile"
}
Invoke-Gcloud @("iam", "service-accounts", "keys", "create", $KeyFile, "--iam-account=$email", "--project=$Project")

Write-Host ""
Write-Host "Activate for this shell (non-interactive gcloud / agents):"
Write-Host "  gcloud auth activate-service-account --key-file=""$KeyFile"""
Write-Host "  gcloud config set project $Project"
Write-Host ""
Write-Host "Application Default Credentials (client libraries):"
Write-Host "  `$env:GOOGLE_APPLICATION_CREDENTIALS=""$KeyFile"""
Write-Host ""

if ($PrintAccessToken) {
  Invoke-Gcloud @("auth", "activate-service-account", "--key-file=$KeyFile")
  $tok = gcloud auth print-access-token 2>&1
  if ($LASTEXITCODE -ne 0) { throw "print-access-token failed" }
  Write-Host "Access token (short-lived, do not log in production):"
  Write-Host $tok
}
