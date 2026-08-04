<#
.SYNOPSIS
  Run COBOL corpus census + full prove gates on GCE (Linux) only.

.DESCRIPTION
  Windows blocks reliable Node COBOL prove (cobc / fixture / timing). Sync G10120
  scripts to the preferred VM, clone public corpora off-repo, run census +
  gce-cobol-full-prove-gates.sh.

.EXAMPLE
  pnpm run test:gce:cobol
  pnpm run test:gce:cobol:status
  pnpm run test:gce:cobol:foreground
#>
param(
  [string] $Project = $(if ($env:CHRYSALIS_GCE_PROJECT) { $env:CHRYSALIS_GCE_PROJECT } else { "chrysalis-dev-f5x6qv" }),
  [string] $Zone = "us-central1-a",
  [string] $Name = "",
  [switch] $Detach,
  [switch] $SkipRefresh,
  [switch] $Status,
  [switch] $FetchReports,
  [switch] $TunnelThroughIap
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot "gce-auth-activate.ps1") | Out-Null
. (Join-Path $PSScriptRoot "gce-protected-instances.ps1")
if (-not $Name) { $Name = Get-ChrysalisGceDefaultInstance }
Initialize-ChrysalisGceAuth -Project $Project -RepoRoot $repoRoot -Quiet | Out-Null
$VmName = $Name
$sshExtra = @()
if ($TunnelThroughIap) { $sshExtra = @("--tunnel-through-iap") }

function Invoke-Gcloud {
  param([string[]] $GcloudArgs)
  & gcloud @GcloudArgs
  if ($LASTEXITCODE -ne 0) { throw "gcloud failed: gcloud $($GcloudArgs -join ' ')" }
}

function Sync-CobolGateFiles {
  Write-Host "=== Sync COBOL G10120 gate files to ${VmName} ==="
  $pairs = @(
    @{ Local = "scripts\gce-cobol-prove-only.sh"; Remote = "chrysalis-test/scripts/gce-cobol-prove-only.sh" },
    @{ Local = "scripts\gce-cobol-full-prove-gates.sh"; Remote = "chrysalis-test/scripts/gce-cobol-full-prove-gates.sh" },
    @{ Local = "scripts\gce-clone-cobol-corpora.sh"; Remote = "chrysalis-test/scripts/gce-clone-cobol-corpora.sh" },
    @{ Local = "scripts\hub-ingest\hub-cobol-corpus-census.mjs"; Remote = "chrysalis-test/scripts/hub-ingest/hub-cobol-corpus-census.mjs" },
    @{ Local = "scripts\hub-ingest\hub-cobol-corpus-query.mjs"; Remote = "chrysalis-test/scripts/hub-ingest/hub-cobol-corpus-query.mjs" },
    @{ Local = "scripts\hub-ingest\hub-cobol-peel-candidates.mjs"; Remote = "chrysalis-test/scripts/hub-ingest/hub-cobol-peel-candidates.mjs" },
    @{ Local = "scripts\hub-ingest\hub-cobol-external-prove-smoke.mjs"; Remote = "chrysalis-test/scripts/hub-ingest/hub-cobol-external-prove-smoke.mjs" },
    @{ Local = "scripts\hub-ingest\hub-cobol-clbs-prove-smoke.mjs"; Remote = "chrysalis-test/scripts/hub-ingest/hub-cobol-clbs-prove-smoke.mjs" },
    @{ Local = "fixtures\ci\cobol-public-corpus-registry.json"; Remote = "chrysalis-test/fixtures/ci/cobol-public-corpus-registry.json" },
    @{ Local = "docs\COBOL-EXTERNAL-PROVE-CORPORA.md"; Remote = "chrysalis-test/docs/COBOL-EXTERNAL-PROVE-CORPORA.md" },
    @{ Local = "package.json"; Remote = "chrysalis-test/package.json" }
  )
  foreach ($p in $pairs) {
    $local = Join-Path $repoRoot $p.Local
    if (-not (Test-Path -LiteralPath $local)) { throw "Missing: $local" }
    $remote = "${VmName}:$($p.Remote)"
    & gcloud compute scp --zone=$Zone --project=$Project @sshExtra -- "$local" $remote
    if ($LASTEXITCODE -ne 0) { throw "scp failed for $($p.Local)" }
  }
  $chmod = @"
cd ~/chrysalis-test
sed -i 's/\r$//' scripts/gce-cobol-prove-only.sh scripts/gce-cobol-full-prove-gates.sh scripts/gce-clone-cobol-corpora.sh
chmod +x scripts/gce-cobol-prove-only.sh scripts/gce-cobol-full-prove-gates.sh scripts/gce-clone-cobol-corpora.sh
"@
  Invoke-ChrysalisGceSsh -Name $VmName -Zone $Zone -Project $Project -Extra $sshExtra -Command $chmod
}

if ($Status) {
  $remote = @'
if test -f ~/chrysalis-test/reports/ci/gce-cobol-prove.ok; then echo STATUS_OK
elif test -f ~/chrysalis-test/reports/ci/gce-cobol-prove.fail; then echo STATUS_FAILED
else echo STATUS_RUNNING; fi
pgrep -af 'gce-cobol-prove|cobol-clbs-prove|cobol-external-prove|cobol-corpus-census' 2>/dev/null | head -5 || true
echo '--- log tail ---'
tail -n 40 ~/chrysalis-test/reports/ci/gce-cobol-prove-run.log 2>/dev/null || echo no_log
'@
  try {
    Invoke-ChrysalisGceSsh -Name $VmName -Zone $Zone -Project $Project -Extra $sshExtra -Command $remote
    exit 0
  } catch {
    exit 1
  }
}

if ($FetchReports) {
  $outDir = Join-Path $repoRoot "reports\cobol"
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null
  foreach ($f in @("corpus-census.json", "corpus-feature-index.json", "peel-candidates.json", "external-prove.json", "clbs-prove.json")) {
    & gcloud compute scp --zone=$Zone --project=$Project @sshExtra -- "${VmName}:chrysalis-test/reports/cobol/${f}" (Join-Path $outDir $f)
  }
  & gcloud compute scp --zone=$Zone --project=$Project @sshExtra -- "${VmName}:chrysalis-test/reports/ci/gce-cobol-prove-run.log" (Join-Path $repoRoot "reports\ci\gce-cobol-prove-run.log")
  exit 0
}

if (-not $SkipRefresh) {
  Write-Host "=== Refresh VM tree (local HEAD) ==="
  $refreshParams = @{
    Project       = $Project
    Zone          = $Zone
    Name          = $Name
    SkipHubFinish = $true
  }
  if ($TunnelThroughIap) { $refreshParams.TunnelThroughIap = $true }
  & "$PSScriptRoot\gce-test-vm-refresh.ps1" @refreshParams
}

Sync-CobolGateFiles

if ($Detach) {
  Write-Host "=== Start detached COBOL prove on ${VmName} ==="
  $start = @"
cd ~/chrysalis-test
mkdir -p reports/ci
rm -f reports/ci/gce-cobol-prove.ok reports/ci/gce-cobol-prove.fail
nohup bash scripts/gce-cobol-prove-only.sh </dev/null >>reports/ci/gce-cobol-prove-run.log 2>&1 &
sleep 2
if pgrep -f gce-cobol-prove-only.sh >/dev/null 2>&1; then echo 'started gce-cobol-prove worker'; else echo 'WARN: worker not found (check gce-cobol-prove-run.log)'; fi
"@
  Invoke-ChrysalisGceSsh -Name $VmName -Zone $Zone -Project $Project -Extra $sshExtra -Command $start
  Write-Host ""
  Write-Host "Detached. Status:  pnpm run test:gce:cobol:status"
  Write-Host "Fetch:             pnpm run test:gce:cobol:fetch"
  exit 0
}

Write-Host "=== Foreground COBOL prove on ${VmName} ==="
Invoke-ChrysalisGceSsh -Name $VmName -Zone $Zone -Project $Project -Extra $sshExtra -Command "bash ~/chrysalis-test/scripts/gce-cobol-prove-only.sh"
exit $LASTEXITCODE
