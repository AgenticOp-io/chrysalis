<#
.SYNOPSIS
  Activate gitignored GCP service-account key for non-interactive gcloud (agents, CI, scripts).

.DESCRIPTION
  User OAuth (`gcloud auth login`) expires and cannot refresh in non-interactive shells.
  A service-account JSON key refreshes indefinitely until the key is revoked.

  Key search order:
  1. CHRYSALIS_GCP_SA_KEY_FILE
  2. GOOGLE_APPLICATION_CREDENTIALS (if file exists)
  3. <repo>/.chrysalis-gcp-sa-key.json
  4. %USERPROFILE%\.chrysalis\gcp-sa-key.json

  One-time setup (interactive browser once):
    gcloud auth login
    pnpm run gce:auth:setup

.EXAMPLE
  pnpm run gce:auth:activate
#>
param(
  [string] $Project = $(if ($env:CHRYSALIS_GCE_PROJECT) { $env:CHRYSALIS_GCE_PROJECT } else { "chrysalis-dev-f5x6qv" }),
  [switch] $Quiet
)

$ErrorActionPreference = "Stop"
$env:CLOUDSDK_CORE_DISABLE_PROMPTS = "1"

function Get-ChrysalisGcpSaKeyPath {
  param([string] $RepoRoot)

  $candidates = @()
  if ($env:CHRYSALIS_GCP_SA_KEY_FILE) { $candidates += $env:CHRYSALIS_GCP_SA_KEY_FILE }
  if ($env:GOOGLE_APPLICATION_CREDENTIALS) { $candidates += $env:GOOGLE_APPLICATION_CREDENTIALS }
  $candidates += (Join-Path $RepoRoot ".chrysalis-gcp-sa-key.json")
  $candidates += (Join-Path $env:USERPROFILE ".chrysalis\gcp-sa-key.json")

  foreach ($path in $candidates) {
    if ($path -and (Test-Path -LiteralPath $path)) { return (Resolve-Path -LiteralPath $path).Path }
  }
  return $null
}

function Initialize-ChrysalisGceRemoteClient {
  # Windows: force OpenSSH so gcloud never spawns PuTTY/plink windows (docs/HOW-TO.md §25, DESIGN D412).
  $env:CLOUDSDK_CORE_DISABLE_PROMPTS = "1"
  if ($IsWindows -or $env:OS -eq "Windows_NT") {
    $env:CLOUDSDK_COMPUTE_SSH_USE_OPENSSH = "True"
  }
}

function Build-ChrysalisGceSshArgs {
  param(
    [Parameter(Mandatory)][string] $Name,
    [Parameter(Mandatory)][string] $Zone,
    [Parameter(Mandatory)][string] $Project,
    [Parameter(Mandatory)][string] $Command,
    [string[]] $Extra = @()
  )
  Initialize-ChrysalisGceRemoteClient
  if ([string]::IsNullOrWhiteSpace($Command)) {
    throw "[chrysalis-gce] Refusing interactive gcloud compute ssh (missing --command)."
  }
  @("compute", "ssh", $Name, "--zone=$Zone", "--project=$Project") + $Extra + @("--command=$Command")
}

function Invoke-ChrysalisGceSsh {
  param(
    [Parameter(Mandatory)][string] $Name,
    [Parameter(Mandatory)][string] $Zone,
    [Parameter(Mandatory)][string] $Project,
    [Parameter(Mandatory)][string] $Command,
    [string[]] $Extra = @()
  )
  $gcloudArgs = Build-ChrysalisGceSshArgs -Name $Name -Zone $Zone -Project $Project -Command $Command -Extra $Extra
  & gcloud @gcloudArgs
  if ($LASTEXITCODE -ne 0) { throw "gcloud ssh failed: gcloud $($gcloudArgs -join ' ')" }
}

function Initialize-ChrysalisGceAuth {
  param(
    [string] $Project,
    [string] $RepoRoot = $(Split-Path -Parent (Split-Path -Parent $PSScriptRoot)),
    [switch] $Quiet
  )

  Initialize-ChrysalisGceRemoteClient

  $keyFile = Get-ChrysalisGcpSaKeyPath -RepoRoot $RepoRoot
  if (-not $keyFile) {
    if (-not $Quiet) {
      Write-Host @"
[chrysalis-gce-auth] No service-account key found.
  One-time (browser):  gcloud auth login
  Then create key:     pnpm run gce:auth:setup
  Or set:              CHRYSALIS_GCP_SA_KEY_FILE=C:\path\to\key.json
"@
    }
    return $false
  }

  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & gcloud auth activate-service-account --key-file="$keyFile" 2>&1 | Out-Null
  $activateExit = $LASTEXITCODE
  $ErrorActionPreference = $prevEap
  if ($activateExit -ne 0) { throw "gcloud auth activate-service-account failed for $keyFile" }

  if ($Project) {
    $ErrorActionPreference = "Continue"
    & gcloud config set project $Project 2>&1 | Out-Null
    $projectExit = $LASTEXITCODE
    $ErrorActionPreference = $prevEap
    if ($projectExit -ne 0) { throw "gcloud config set project failed" }
  }

  $env:GOOGLE_APPLICATION_CREDENTIALS = $keyFile
  if (-not $Quiet) {
    $acct = gcloud config get-value account 2>$null
    Write-Host "[chrysalis-gce-auth] active account=$acct project=$Project key=$keyFile"
  }
  return $true
}

Initialize-ChrysalisGceRemoteClient

if ($MyInvocation.InvocationName -eq '.') {
  return
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$ok = Initialize-ChrysalisGceAuth -Project $Project -RepoRoot $repoRoot -Quiet:$Quiet
if (-not $ok) { exit 1 }

# Prove compute API works (non-interactive).
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$probe = gcloud compute instances list --project=$Project --limit=1 --format="value(name)" 2>&1
$probeExit = $LASTEXITCODE
$ErrorActionPreference = $prevEap
if ($probeExit -ne 0) {
  Write-Error "[chrysalis-gce-auth] key activated but compute probe failed: $probe"
  exit 1
}
if (-not $Quiet) {
  Write-Host "[chrysalis-gce-auth] compute probe ok"
}