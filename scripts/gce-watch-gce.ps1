<#
.SYNOPSIS
  Poll GCE every N seconds; append compact status lines to a local log (non-blocking monitor).

.EXAMPLE
  .\scripts\gce-watch-gce.ps1
  .\scripts\gce-watch-gce.ps1 -IntervalSec 10 -Detach
  .\scripts\gce-watch-gce.ps1 -Once
  Get-Content reports/ci/gce-watch.log -Tail 20 -Wait
#>
param(
  [string] $Project = $(if ($env:CHRYSALIS_GCE_PROJECT) { $env:CHRYSALIS_GCE_PROJECT } else { "chrysalis-dev-f5x6qv" }),
  [string] $Zone = "us-central1-a",
  [string] $Name = "chrysalis-test-vm",
  [int] $IntervalSec = $(if ($env:CHRYSALIS_GCE_WATCH_INTERVAL_SEC) { [int]$env:CHRYSALIS_GCE_WATCH_INTERVAL_SEC } else { 10 }),
  [string] $LogPath = "",
  [switch] $Detach,
  [switch] $Once,
  [ValidateSet("none", "fetch")]
  [string] $OnSuccess = "none",
  [parameter(ValueFromRemainingArguments = $true)]
  [string[]] $SshExtra
)

$ErrorActionPreference = "Stop"
$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$repoRoot = Split-Path -Parent $scriptDir
if (-not $LogPath) { $LogPath = Join-Path $repoRoot "reports/ci/gce-watch.log" }
$fetchScript = Join-Path $scriptDir "gce-fetch-reports.ps1"
$pidFile = Join-Path (Split-Path -Parent $LogPath) "gce-watch.pid"

function Write-WatchLog {
  param([string] $Line)
  $dir = Split-Path -Parent $LogPath
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  Add-Content -Path $LogPath -Value $Line -Encoding utf8
}

function Get-GceWatchSnapshot {
  param([string[]] $Extra)
  $remote = @'
OK=0; ALIVE=0
test -f ~/chrysalis-test/reports/ci/gce-all-tests.ok && OK=1
PID=$(cat ~/.chrysalis-gce-test.pid 2>/dev/null || echo -)
WORKER_PID=$(pgrep -f 'bash scripts/gce-run-all-tests.sh|bash scripts/gce-resume-from-' 2>/dev/null | head -1 || true)
if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then ALIVE=1; fi
if [ -n "$WORKER_PID" ] && kill -0 "$WORKER_PID" 2>/dev/null; then ALIVE=1; PID="$WORKER_PID"; fi
PHASE=$(grep -E '^\[gce-all-tests\].*phase:' ~/chrysalis-test/reports/ci/gce-all-tests.log 2>/dev/null | tail -1 | sed 's/.*phase: //' | tr -d '\r')
if [ -z "$PHASE" ] && [ -f ~/chrysalis-test/reports/ci/gce-progress.json ]; then
  PHASE=$(grep -o '"currentPhase": "[^"]*"' ~/chrysalis-test/reports/ci/gce-progress.json 2>/dev/null | head -1 | sed 's/"currentPhase": "//;s/"$//' | tr -d '\r')
  if [ "$PHASE" = "null" ]; then PHASE=""; fi
fi
PROG=$(cd ~/chrysalis-test 2>/dev/null && node ~/chrysalis-test/scripts/gce-progress.mjs summary 2>/dev/null | head -1 | sed 's/^PROGRESS: //' | tr -d '\r')
FAILLOG=$(grep -lE 'Failed Tests|END exit=[1-9][0-9]*' ~/chrysalis-test/reports/ci/gce-phase-*.log 2>/dev/null | head -1)
echo "OK=$OK"
echo "ALIVE=$ALIVE"
echo "PID=$PID"
echo "PHASE=$PHASE"
echo "PROG=$PROG"
echo "FAILLOG=${FAILLOG:-}"
if [ -n "$FAILLOG" ]; then echo '---FAIL---'; tail -15 "$FAILLOG" | tr -d '\r'; fi
'@
  $out = & gcloud compute ssh $Name --zone=$Zone --project=$Project @Extra --command=$remote 2>&1
  if ($LASTEXITCODE -ne 0) {
    return [pscustomobject]@{
      OkMarker = $false
      Alive    = $false
      Pid      = "-"
      Phase    = "(ssh-error)"
      FailLog  = $null
      FailTail = @($out)
      SshError = $true
    }
  }
  $lines = @($out | ForEach-Object { "$_".Trim() } | Where-Object { $_ })
  $failIdx = [array]::IndexOf($lines, "---FAIL---")
  $failTail = @()
  if ($failIdx -ge 0 -and $failIdx -lt ($lines.Length - 1)) {
    $failTail = $lines[($failIdx + 1)..($lines.Length - 1)]
  }
  $kv = @{}
  foreach ($line in ($lines | Where-Object { $_ -match '^[A-Z]+=' })) {
    $i = $line.IndexOf("=")
    if ($i -gt 0) { $kv[$line.Substring(0, $i)] = $line.Substring($i + 1) }
  }
  [pscustomobject]@{
    OkMarker = ($kv["OK"] -eq "1")
    Alive    = ($kv["ALIVE"] -eq "1")
    Pid      = if ($kv["PID"]) { $kv["PID"] } else { "-" }
    Phase    = if ($kv["PHASE"]) { $kv["PHASE"] } else { "(none)" }
    Prog     = if ($kv["PROG"]) { $kv["PROG"] } else { "" }
    FailLog  = if ($kv["FAILLOG"]) { $kv["FAILLOG"] } else { $null }
    FailTail = $failTail
    SshError = $false
  }
}

function Invoke-WatchLoop {
  $poll = 0
  $lastStatus = $null
  $lastFailLog = $null
  Write-WatchLog "[gce-watch] start interval=${IntervalSec}s log=$LogPath project=$Project"
  while ($true) {
    $poll++
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $snap = Get-GceWatchSnapshot -Extra $SshExtra
    $status = if ($snap.SshError) { "SSH_ERROR" }
      elseif ($snap.OkMarker) { "OK" }
      elseif (-not $snap.Alive) { "FAILED" }
      else { "RUNNING" }
    $line = "$stamp | poll=$poll | status=$status | pid=$($snap.Pid)"
    if ($snap.Prog) { $line += " | $($snap.Prog)" }
    if ($snap.Phase) { $line += " | phase=$($snap.Phase)" }
    if ($snap.FailLog) { $line += " | fail=$($snap.FailLog)" }
    Write-WatchLog $line
    if ($status -ne $lastStatus) {
      Write-WatchLog "[gce-watch] state-change: $lastStatus -> $status"
      $lastStatus = $status
    }
    if ($snap.FailLog -and $snap.FailLog -ne $lastFailLog -and $snap.FailTail.Count -gt 0) {
      Write-WatchLog "[gce-watch] failure-tail:"
      foreach ($fl in $snap.FailTail) { Write-WatchLog "  $fl" }
      $lastFailLog = $snap.FailLog
    }
    if ($snap.OkMarker) {
      Write-WatchLog "[gce-watch] ALL OK — gce-all-tests.ok present"
      if ($OnSuccess -eq "fetch") {
        & $fetchScript -Project $Project -Zone $Zone -Name $Name @SshExtra
        Write-WatchLog "[gce-watch] reports fetched via gce-fetch-reports.ps1"
      }
      exit 0
    }
    if (-not $snap.Alive -and -not $snap.OkMarker) {
      Write-WatchLog "[gce-watch] FAILED — process dead, no ok marker"
      exit 1
    }
    if ($Once) { exit 0 }
    Start-Sleep -Seconds $IntervalSec
  }
}

if ($Detach) {
  if (Test-Path $pidFile) {
    $oldPid = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($oldPid -and (Get-Process -Id $oldPid -ErrorAction SilentlyContinue)) {
      Write-Host "gce-watch already running (pid $oldPid); log=$LogPath"
      exit 0
    }
  }
  $args = @(
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $PSCommandPath,
    "-IntervalSec", $IntervalSec, "-LogPath", $LogPath, "-OnSuccess", $OnSuccess
  )
  if ($SshExtra) { $args += $SshExtra }
  $proc = Start-Process -FilePath "powershell" -ArgumentList $args -WindowStyle Hidden -PassThru
  Set-Content -Path $pidFile -Value $proc.Id -Encoding ascii
  Write-Host "gce-watch detached pid=$($proc.Id) interval=${IntervalSec}s log=$LogPath"
  Write-Host "Tail: pnpm run test:gce:log"
  exit 0
}

try {
  Invoke-WatchLoop
} finally {
  if (Test-Path $pidFile) { Remove-Item $pidFile -Force -ErrorAction SilentlyContinue }
}
