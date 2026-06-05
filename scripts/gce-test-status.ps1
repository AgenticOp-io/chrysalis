<#
.SYNOPSIS
  Tail remote GCE test log and check for completion marker.
#>
param(
  [string] $Project = $(if ($env:CHRYSALIS_GCE_PROJECT) { $env:CHRYSALIS_GCE_PROJECT } else { "chrysalis-dev-f5x6qv" }),
  [string] $Zone = "us-central1-a",
  [string] $Name = "chrysalis-test-vm",
  [parameter(ValueFromRemainingArguments = $true)]
  [string[]] $SshExtra
)

$remote = @'
if test -f ~/chrysalis-test/reports/ci/gce-all-tests.ok; then echo 'STATUS: OK (gce-all-tests.ok present)'; else echo 'STATUS: running or failed (no ok marker)'; fi
if test -f ~/.chrysalis-gce-test.pid; then echo -n 'PID: '; cat ~/.chrysalis-gce-test.pid; if kill -0 $(cat ~/.chrysalis-gce-test.pid) 2>/dev/null; then echo ' (alive)'; else echo ' (not running)'; fi; fi
echo '--- gce-progress.json ---'
if test -f ~/chrysalis-test/reports/ci/gce-progress.json; then cat ~/chrysalis-test/reports/ci/gce-progress.json; else echo '(no progress file yet)'; fi
echo '--- current phase ---'
grep -E '^\[gce-all-tests\].*phase:' ~/chrysalis-test/reports/ci/gce-all-tests.log 2>/dev/null | tail -n 1 || echo '(no phase line yet)'
echo '--- active phase logs ---'
ls -lt ~/chrysalis-test/reports/ci/gce-phase-*.log 2>/dev/null | head -n 3 || echo '(none)'
echo '--- failed phase (if any) ---'
grep -lE 'Failed Tests|END exit=[1-9][0-9]*' ~/chrysalis-test/reports/ci/gce-phase-*.log 2>/dev/null | head -n 1 | xargs -r tail -n 12 || echo '(none)'
echo '--- tail log (latest phase) ---'
LATEST=$(ls -t ~/chrysalis-test/reports/ci/gce-phase-*.log 2>/dev/null | head -n 1)
if test -n "$LATEST"; then tail -n 25 "$LATEST"; else tail -n 25 ~/chrysalis-test/reports/ci/gce-all-tests.log 2>/dev/null || tail -n 25 ~/gce-all-tests.nohup.log 2>/dev/null || echo '(no log yet)'; fi
'@

$gcloudArgs = @("compute", "ssh", $Name, "--zone=$Zone", "--project=$Project") + $SshExtra + @("--command", $remote)
& gcloud @gcloudArgs
exit $LASTEXITCODE
