<#
.SYNOPSIS
  Tail remote GCE test log and check for completion marker.
#>
param(
  [string] $Project = $(if ($env:CHRYSALIS_GCE_PROJECT) { $env:CHRYSALIS_GCE_PROJECT } else { "chrysalis-dev-f5x6qv" }),
  [string] $Zone = "us-central1-a",
  [string] $Name = "",
  [parameter(ValueFromRemainingArguments = $true)]
  [string[]] $SshExtra
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "gce-auth-activate.ps1") | Out-Null
. (Join-Path $PSScriptRoot "gce-protected-instances.ps1")
if (-not $Name) { $Name = Get-ChrysalisGceDefaultInstance }

$remote = @'
if test -f ~/chrysalis-test/reports/ci/gce-all-tests.ok; then echo 'STATUS: OK (gce-all-tests.ok present)'; else echo 'STATUS: running or failed (no ok marker)'; fi
WORKER_PID=$(pgrep -f 'bash scripts/gce-run-all-tests.sh|bash scripts/gce-resume-from-' 2>/dev/null | head -1 || true)
if [ -n "$WORKER_PID" ]; then
  echo -n 'PID: '; echo "$WORKER_PID"; echo ' (worker alive)'
elif test -f ~/.chrysalis-gce-test.pid; then
  echo -n 'PID: '; cat ~/.chrysalis-gce-test.pid
  if kill -0 $(cat ~/.chrysalis-gce-test.pid) 2>/dev/null; then echo ' (alive)'; else echo ' (not running)'; fi
fi
echo '--- progress summary ---'
cd ~/chrysalis-test 2>/dev/null && node ~/chrysalis-test/scripts/gce-progress.mjs summary 2>/dev/null || echo '(no progress manifest yet — old runner or pre-init build)'
echo '--- gce-progress.json (tail) ---'
if test -f ~/chrysalis-test/reports/ci/gce-progress.json; then
  head -n 20 ~/chrysalis-test/reports/ci/gce-progress.json
  echo '...'
else
  echo '(no progress file yet)'
fi
echo '--- current phase (log line) ---'
grep -E '^\[gce-all-tests\].*phase:' ~/chrysalis-test/reports/ci/gce-all-tests.log 2>/dev/null | tail -n 1 || echo '(no phase line yet)'
echo '--- active phase logs ---'
ls -lt ~/chrysalis-test/reports/ci/gce-phase-*.log 2>/dev/null | head -n 3 || echo '(none)'
echo '--- failed phase (if any) ---'
grep -lE 'Failed Tests|END exit=[1-9][0-9]*' ~/chrysalis-test/reports/ci/gce-phase-*.log 2>/dev/null | head -n 1 | xargs -r tail -n 12 || echo '(none)'
echo '--- tail log (latest phase) ---'
LATEST=$(ls -t ~/chrysalis-test/reports/ci/gce-phase-*.log 2>/dev/null | head -n 1)
if test -n "$LATEST"; then tail -n 25 "$LATEST" | sed 's/\x1b\[[0-9;]*m//g' 2>/dev/null || tail -n 25 "$LATEST"; else tail -n 25 ~/chrysalis-test/reports/ci/gce-all-tests.log 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g' 2>/dev/null || tail -n 25 ~/gce-all-tests.nohup.log 2>/dev/null || echo '(no log yet)'; fi
'@

try {
  Invoke-ChrysalisGceSsh -Name $Name -Zone $Zone -Project $Project -Extra $SshExtra -Command $remote
  exit 0
} catch {
  exit 1
}
