<#
.SYNOPSIS
  Background auto-stop for chrysalis-gpu-lab after a bounded session (cost guard).
#>
param(
  [Parameter(Mandatory = $true)][string] $Name,
  [Parameter(Mandatory = $true)][string] $Zone,
  [Parameter(Mandatory = $true)][string] $Project,
  [Parameter(Mandatory = $true)][int] $MaxMinutes,
  [string] $Reason = "max-session"
)

$ErrorActionPreference = "Stop"
$env:CLOUDSDK_CORE_DISABLE_PROMPTS = "1"

$deadline = (Get-Date).AddMinutes($MaxMinutes).ToUniversalTime().ToString("o")
Write-Host "[gpu-lab-auto-stop] reason=$Reason deadline_utc=$deadline max_minutes=$MaxMinutes instance=$Name"

Start-Sleep -Seconds ($MaxMinutes * 60)

$status = gcloud compute instances describe $Name --zone=$Zone --project=$Project --format="value(status)" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "[gpu-lab-auto-stop] instance missing — nothing to stop"
  exit 0
}
if ($status -eq "RUNNING") {
  Write-Host "[gpu-lab-auto-stop] stopping $Name (deadline reached)"
  gcloud compute instances stop $Name --zone=$Zone --project=$Project --quiet
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Host "[gpu-lab-auto-stop] stopped $Name"
} else {
  Write-Host "[gpu-lab-auto-stop] skip — status=$status"
}
