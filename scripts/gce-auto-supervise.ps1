<#
.SYNOPSIS
  Overnight GCE supervisor: sync scripts, poll progress, auto-resume on failure, fetch on success.

.EXAMPLE
  pnpm run test:gce:supervise
  .\scripts\gce-auto-supervise.ps1 -Detach -IntervalSec 120
#>
param(
  [string] $Project = $(if ($env:CHRYSALIS_GCE_PROJECT) { $env:CHRYSALIS_GCE_PROJECT } else { "chrysalis-dev-f5x6qv" }),
  [string] $Zone = "us-central1-a",
  [string] $Name = "",
  [int] $IntervalSec = $(if ($env:CHRYSALIS_GCE_SUPERVISE_INTERVAL_SEC) { [int]$env:CHRYSALIS_GCE_SUPERVISE_INTERVAL_SEC } else { 120 }),
  [int] $MaxResumeAttempts = $(if ($env:CHRYSALIS_GCE_MAX_RESUME) { [int]$env:CHRYSALIS_GCE_MAX_RESUME } else { 8 }),
  [switch] $Detach,
  [parameter(ValueFromRemainingArguments = $true)]
  [string[]] $SshExtra
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "gce-protected-instances.ps1")
if (-not $Name) { $Name = Get-ChrysalisGceDefaultInstance }
$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$repoRoot = Split-Path -Parent $scriptDir
. (Join-Path $scriptDir "gce-auth-activate.ps1") | Out-Null
$logPath = Join-Path $repoRoot "reports/ci/gce-supervise.log"
$pidFile = Join-Path (Split-Path -Parent $logPath) "gce-supervise.pid"
$runScript = Join-Path $scriptDir "gce-run-all-tests.ps1"
$fetchScript = Join-Path $scriptDir "gce-fetch-reports.ps1"
$remoteEnv = "export CHRYSALIS_STATUS_REPO=~/chrysalis-test CHRYSALIS_GCE_ALL_TESTS=1 CHRYSALIS_GCE_HUB_COMPLETION_FAST=1 CHRYSALIS_GCE_SLIM_HUB_STRATEGIC=1 CHRYSALIS_GCE_SKIP_PNPM_INSTALL=1 CHRYSALIS_GCE_SKIP_BUILD=1"

function Write-SuperviseLog {
  param([string] $Line)
  $dir = Split-Path -Parent $logPath
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  Add-Content -Path $logPath -Value $Line -Encoding utf8
}

function Get-RemoteSnapshot {
  param([string[]] $Extra)
  $remote = @'
OK=0; ALIVE=0
test -f ~/chrysalis-test/reports/ci/gce-all-tests.ok && OK=1
PID=$(cat ~/.chrysalis-gce-test.pid 2>/dev/null || echo -)
WORKER_PID=$(pgrep -f 'bash scripts/gce-run-all-tests.sh|bash scripts/gce-resume-from-' 2>/dev/null | head -1 || true)
if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then ALIVE=1; fi
if [ -n "$WORKER_PID" ] && kill -0 "$WORKER_PID" 2>/dev/null; then ALIVE=1; PID="$WORKER_PID"; fi
PROG=$(cd ~/chrysalis-test && node scripts/gce-progress.mjs summary 2>/dev/null | head -1 | tr -d '\r')
RESUME=$(cd ~/chrysalis-test && node scripts/gce-progress.mjs pick-resume 2>/dev/null | tr -d '\r')
echo "OK=$OK"
echo "ALIVE=$ALIVE"
echo "PID=$PID"
echo "PROG=$PROG"
echo "RESUME=$RESUME"
'@
  $gcloudArgs = Build-ChrysalisGceSshArgs -Name $Name -Zone $Zone -Project $Project -Command $remote -Extra $Extra
  $out = & gcloud @gcloudArgs 2>&1
  if ($LASTEXITCODE -ne 0) { throw "gcloud ssh failed: $out" }
  $kv = @{}
  foreach ($line in ($out | ForEach-Object { "$_".Trim() } | Where-Object { $_ -match '^[A-Z]+=' })) {
    $i = $line.IndexOf("=")
    if ($i -gt 0) { $kv[$line.Substring(0, $i)] = $line.Substring($i + 1) }
  }
  [pscustomobject]@{
    OkMarker = ($kv["OK"] -eq "1")
    Alive    = ($kv["ALIVE"] -eq "1")
    Pid      = if ($kv["PID"]) { $kv["PID"] } else { "-" }
    Prog     = if ($kv["PROG"]) { $kv["PROG"] } else { "" }
    Resume   = if ($kv["RESUME"]) { $kv["RESUME"] } else { "" }
  }
}

function Start-RemoteResume {
  param([string] $ResumeScript, [string[]] $Extra)
  if (-not $ResumeScript) { throw "empty resume script" }
  Write-SuperviseLog "[gce-supervise] launching resume: $ResumeScript"
  $start = @"
cd ~/chrysalis-test
rm -f ~/.chrysalis-gce-test.lock
mkdir -p reports/ci
$remoteEnv
nohup bash scripts/$ResumeScript </dev/null >>reports/ci/gce-all-tests.log 2>&1 &
sleep 2
if test -f ~/.chrysalis-gce-test.pid; then echo started pid=`$(cat ~/.chrysalis-gce-test.pid); else echo WARN-no-pid; fi
"@
  $gcloudArgs = Build-ChrysalisGceSshArgs -Name $Name -Zone $Zone -Project $Project -Command $start -Extra $Extra
  $out = & gcloud @gcloudArgs 2>&1
  Write-SuperviseLog "[gce-supervise] resume output: $($out -join ' | ')"
}

function Invoke-SuperviseLoop {
  Write-SuperviseLog "[gce-supervise] loop start interval=${IntervalSec}s maxResume=${MaxResumeAttempts}"
  & $runScript -Project $Project -Zone $Zone -Name $Name -SkipRefresh -SyncOnly @SshExtra | Out-Null
  Write-SuperviseLog "[gce-supervise] scripts synced to VM"

  $resumeAttempts = 0
  $poll = 0
  while ($true) {
    $poll++
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    try {
      $snap = Get-RemoteSnapshot -Extra $SshExtra
    } catch {
      Write-SuperviseLog "$stamp | poll=$poll | SSH_ERROR | $($_.Exception.Message)"
      Start-Sleep -Seconds $IntervalSec
      continue
    }

    $line = "$stamp | poll=$poll | ok=$($snap.OkMarker) | alive=$($snap.Alive) | pid=$($snap.Pid)"
    if ($snap.Prog) { $line += " | $($snap.Prog)" }
    Write-SuperviseLog $line

    if ($snap.OkMarker) {
      Write-SuperviseLog "[gce-supervise] ALL OK - fetching reports"
      & $fetchScript -Project $Project -Zone $Zone -Name $Name @SshExtra
      Write-SuperviseLog "[gce-supervise] done"
      exit 0
    }

    if ($snap.Alive) {
      Start-Sleep -Seconds $IntervalSec
      continue
    }

    if ($resumeAttempts -ge $MaxResumeAttempts) {
      Write-SuperviseLog "[gce-supervise] FAILED - max resume attempts ($MaxResumeAttempts)"
      exit 1
    }

    $resume = $snap.Resume
    if (-not $resume) {
      Write-SuperviseLog "[gce-supervise] FAILED - worker dead, no resume script (progress complete?)"
      exit 1
    }

    $resumeAttempts++
    Start-RemoteResume -ResumeScript $resume -Extra $SshExtra
    Start-Sleep -Seconds 30
  }
}

if ($Detach) {
  if (Test-Path $pidFile) {
    $oldPid = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($oldPid -and (Get-Process -Id $oldPid -ErrorAction SilentlyContinue)) {
      Write-Host "gce-supervise already running (pid $oldPid); log=$logPath"
      exit 0
    }
  }
  $args = @(
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $PSCommandPath,
    "-IntervalSec", $IntervalSec, "-MaxResumeAttempts", $MaxResumeAttempts
  )
  if ($SshExtra) { $args += $SshExtra }
  $proc = Start-Process -FilePath "powershell" -ArgumentList $args -WindowStyle Hidden -PassThru
  Set-Content -Path $pidFile -Value $proc.Id -Encoding ascii
  Write-Host ("gce-supervise detached pid={0} interval={1}s log={2}" -f $proc.Id, $IntervalSec, $logPath)
  Write-Host 'Tail: Get-Content reports/ci/gce-supervise.log -Tail 20 -Wait'
  exit 0
}

try {
  Invoke-SuperviseLoop
} finally {
  if (Test-Path $pidFile) { Remove-Item $pidFile -Force -ErrorAction SilentlyContinue }
}
