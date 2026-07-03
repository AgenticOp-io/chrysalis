<#
.SYNOPSIS
  Budget on/off GPU lab VM for IS-T2 LoRA experiments (T4 spot by default).

.DESCRIPTION
  Separate from CPU chrysalis-test-vm. Spot T4 ~$0.11/hr in us-central1.
  Deep Learning VM image with NVIDIA drivers. Start/stop to control spend.

.EXAMPLE
  pnpm run gpu-lab:create
  pnpm run gpu-lab:start
  pnpm run gpu-lab:prep
  pnpm run gpu-lab:sync
  pnpm run gpu-lab:train
  pnpm run gpu-lab:stop
#>
param(
  [string] $Project = $(if ($env:CHRYSALIS_GCE_PROJECT) { $env:CHRYSALIS_GCE_PROJECT } else { "chrysalis-dev-f5x6qv" }),
  [string] $Zone = "us-central1-a",
  [string] $Name = "chrysalis-gpu-lab",
  [switch] $Create,
  [switch] $Start,
  [switch] $Stop,
  [switch] $Delete,
  [switch] $Status,
  [switch] $CheckQuota,
  [switch] $Bootstrap,
  [switch] $Ssh,
  [switch] $Sync,
  [switch] $Train,
  [switch] $OnDemand,
  [switch] $L4,
  [switch] $TunnelThroughIap,
  [switch] $Recreate,
  [int] $MaxMinutes = $(if ($env:CHRYSALIS_GPU_LAB_MAX_MINUTES) { [int]$env:CHRYSALIS_GPU_LAB_MAX_MINUTES } else { 120 })
)

$ErrorActionPreference = "Stop"
$env:CLOUDSDK_CORE_DISABLE_PROMPTS = "1"
$repoRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot "gce-auth-activate.ps1") | Out-Null
Initialize-ChrysalisGceAuth -Project $Project -RepoRoot $repoRoot -Quiet | Out-Null

$sshExtra = @()
if ($TunnelThroughIap) { $sshExtra = @("--tunnel-through-iap") }

function Test-GpuLabWindowsClient {
  return ($IsWindows -or $env:OS -eq "Windows_NT")
}

function Assert-NotWindowsDirectGpuOps {
  param([string] $Op)
  if (Test-GpuLabWindowsClient) {
    throw @"
[gpu-lab] $Op to chrysalis-gpu-lab from Windows opens PuTTY/plink unless routed via the CPU VM.
  Use: pnpm run gpu-lab:gce          (detached dry-run on chrysalis-test-vm)
        pnpm run gpu-lab:gce:status
  See: docs/GCE-GPU-LAB.md
"@
  }
}

function Get-GpuLabSshFlagArgs {
  # OpenSSH (Initialize-ChrysalisGceRemoteClient) accepts -o flags; legacy PuTTY does not.
  if ((Test-GpuLabWindowsClient) -and ($env:CLOUDSDK_COMPUTE_SSH_USE_OPENSSH -ne "True")) {
    return @("--strict-host-key-checking=no")
  }
  return @(
    "--ssh-flag=-o", "StrictHostKeyChecking=accept-new",
    "--ssh-flag=-o", "UserKnownHostsFile=/dev/null",
    "--ssh-flag=-o", "BatchMode=yes"
  )
}

function Get-GpuLabBootstrapRemote {
  return "${Name}:gce-gpu-lab-bootstrap.sh"
}

function Invoke-GpuLabBootstrap {
  $bootstrapScript = Join-Path $PSScriptRoot "gce-gpu-lab-bootstrap.sh"
  Invoke-GcloudScp -Local $bootstrapScript -Remote (Get-GpuLabBootstrapRemote)
  $cmd = "chmod +x ~/gce-gpu-lab-bootstrap.sh && bash ~/gce-gpu-lab-bootstrap.sh"
  $gcloudArgs = @(
    "compute", "ssh", $Name, "--zone=$Zone", "--project=$Project"
  ) + @(Get-GpuLabSshFlagArgs) + $sshExtra + @("--command", $cmd)
  Invoke-Gcloud -GcloudArgs $gcloudArgs
}

function Get-GpuLabTrainSshFlagArgs {
  $flags = @(Get-GpuLabSshFlagArgs)
  if (-not (Test-GpuLabWindowsClient)) {
    $flags += @(
      "--ssh-flag=-o", "ServerAliveInterval=30",
      "--ssh-flag=-o", "ConnectTimeout=30"
    )
  }
  return $flags
}


function Get-GpuLabAutoStopEnabled {
  return $env:CHRYSALIS_GPU_LAB_AUTO_STOP -ne "0"
}

function Start-GpuLabAutoStop {
  param(
    [string] $Reason
  )
  if (-not (Get-GpuLabAutoStopEnabled)) {
    Write-Host "Auto-stop disabled (CHRYSALIS_GPU_LAB_AUTO_STOP=0)"
    return
  }
  if ($MaxMinutes -lt 1) { throw "MaxMinutes must be >= 1" }
  $deadlineUtc = (Get-Date).AddMinutes($MaxMinutes).ToUniversalTime().ToString("o")
  Write-Host "GPU lab auto-stop in ${MaxMinutes} min (deadline_utc=$deadlineUtc). Override: CHRYSALIS_GPU_LAB_MAX_MINUTES. Disable: CHRYSALIS_GPU_LAB_AUTO_STOP=0"
  $helper = Join-Path $PSScriptRoot "gce-gpu-lab-auto-stop.ps1"
  Start-Process -WindowStyle Hidden -FilePath "powershell.exe" -ArgumentList @(
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $helper,
    "-Name", $Name, "-Zone", $Zone, "-Project", $Project,
    "-MaxMinutes", "$MaxMinutes", "-Reason", $Reason
  ) | Out-Null
}

function Format-GcloudFailure {
  param(
    [string[]] $GcloudArgs,
    [object] $Output
  )
  $text = if ($Output) { ($Output | Out-String).Trim() } else { "" }
  $cmd = "gcloud $($GcloudArgs -join ' ')"

  if ($text -match "GPUS_ALL_REGIONS|GPUS-ALL-REGIONS") {
    $quotaUrl = "https://console.cloud.google.com/iam-admin/quotas?project=$Project&metric=compute.googleapis.com%2Fgpus_all_regions"
    return @(
      "GPU lab create blocked: project GPUS_ALL_REGIONS quota is 0.",
      "Request at least 1 GPU (global) before pnpm run gpu-lab:create.",
      "Console: $quotaUrl",
      "",
      "gcloud output:",
      $text
    ) -join "`n"
  }
  if ($text -match "Quota 'PREEMPTIBLE_NVIDIA_T4_GPUS'|NVIDIA_T4_GPUS") {
    $quotaUrl = "https://console.cloud.google.com/iam-admin/quotas?project=$Project&metric=compute.googleapis.com%2Fnvidia_t4_gpus"
    return @(
      "GPU lab create blocked: NVIDIA T4 quota exceeded in $Zone.",
      "Console: $quotaUrl",
      "",
      "gcloud output:",
      $text
    ) -join "`n"
  }
  if ($text -match "was not found" -and $text -match "image") {
    return @(
      "GPU lab create failed: Deep Learning VM image family not found.",
      "Update image-family in scripts/gce-gpu-lab.ps1 (see: gcloud compute images list --project=deeplearning-platform-release).",
      "",
      "gcloud output:",
      $text
    ) -join "`n"
  }

  $parts = @("gcloud command failed.", "Command: $cmd")
  if ($text) { $parts += "Output:`n$text" } else { $parts += "No output captured." }
  return ($parts -join "`n")
}

function Test-GpuLabQuota {
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $info = gcloud compute project-info describe --project=$Project --format=json 2>$null
  $ErrorActionPreference = $prevEap
  if ($LASTEXITCODE -ne 0 -or -not $info) {
    Write-Host "[gpu-lab] warn: could not read project quotas"
    return $true
  }
  $doc = $info | ConvertFrom-Json
  $globalGpu = $doc.quotas | Where-Object { $_.metric -eq "GPUS_ALL_REGIONS" } | Select-Object -First 1
  if ($globalGpu -and [double]$globalGpu.limit -le 0) {
    $quotaUrl = "https://console.cloud.google.com/iam-admin/quotas?project=$Project&metric=compute.googleapis.com%2Fgpus_all_regions"
    Write-Host @"

[gpu-lab] BLOCKED: GPUS_ALL_REGIONS quota is 0 on project $Project.
  Regional T4/L4 quotas do not matter until this global quota is > 0.
  Request quota: $quotaUrl
  Then re-run: pnpm run gpu-lab:create

"@
    return $false
  }
  $metric = if ($L4) { "NVIDIA_L4_GPUS" } else { "PREEMPTIBLE_NVIDIA_T4_GPUS" }
  if ($OnDemand) { $metric = if ($L4) { "NVIDIA_L4_GPUS" } else { "NVIDIA_T4_GPUS" } }
  $region = ($Zone -replace "-[a-z]$", "")
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $reg = gcloud compute regions describe $region --project=$Project --format=json 2>$null
  $ErrorActionPreference = $prevEap
  if ($LASTEXITCODE -eq 0 -and $reg) {
    $rdoc = $reg | ConvertFrom-Json
    $rq = $rdoc.quotas | Where-Object { $_.metric -eq $metric } | Select-Object -First 1
    if ($rq -and [double]$rq.limit -le 0) {
      Write-Host "[gpu-lab] BLOCKED: $metric quota is 0 in $region"
      return $false
    }
    Write-Host "[gpu-lab] quota ok: GPUS_ALL_REGIONS limit=$($globalGpu.limit), $metric limit=$($rq.limit) in $region"
  }
  return $true
}

function Wait-GpuLabSsh {
  param([int] $MaxAttempts = 36)
  for ($i = 1; $i -le $MaxAttempts; $i++) {
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & gcloud compute ssh $Name --zone=$Zone --project=$Project @sshExtra @(Get-GpuLabSshFlagArgs) --command="echo gpu-lab-ssh-ready" 2>&1 | Out-Null
    $ok = ($LASTEXITCODE -eq 0)
    $ErrorActionPreference = $prevEap
    if ($ok) {
      Write-Host "[gpu-lab] SSH ready (attempt $i)"
      return $true
    }
    Write-Host "[gpu-lab] waiting for SSH ($i/$MaxAttempts)..."
    Start-Sleep -Seconds 10
  }
  return $false
}

function Invoke-GcloudScp {
  param(
    [string] $Local,
    [string] $Remote
  )
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & gcloud compute scp --zone=$Zone --project=$Project @sshExtra @(Get-GpuLabSshFlagArgs) -- "$Local" $Remote 2>&1 | Out-Null
  $exit = $LASTEXITCODE
  $ErrorActionPreference = $prevEap
  if ($exit -ne 0) { throw "scp failed for $Local" }
}

function Invoke-Gcloud {
  param([string[]] $GcloudArgs)
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $out = & gcloud @GcloudArgs 2>&1
  $exit = $LASTEXITCODE
  $ErrorActionPreference = $prevEap
  if ($exit -ne 0) {
    $message = Format-GcloudFailure -GcloudArgs $GcloudArgs -Output $out
    Write-Host $message
    exit 2
  }
  if ($out) { Write-Host $out }
}

function Get-InstanceStatus {
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $fmt = gcloud compute instances describe $Name --zone=$Zone --project=$Project --format="value(status)" 2>$null
  $exit = $LASTEXITCODE
  $ErrorActionPreference = $prevEap
  if ($exit -ne 0) { return "NOT_FOUND" }
  return $fmt
}

if (-not ($Create -or $Start -or $Stop -or $Delete -or $Status -or $CheckQuota -or $Bootstrap -or $Ssh -or $Sync -or $Train)) {
  $Status = $true
}

if ($CheckQuota) {
  if (Test-GpuLabQuota) { exit 0 }
  exit 2
}

if ($Bootstrap) {
  Assert-NotWindowsDirectGpuOps -Op "Bootstrap"
  $st = Get-InstanceStatus
  if ($st -ne "RUNNING") { throw "Instance $Name is $st - run pnpm run gpu-lab:start first" }
  if (-not (Wait-GpuLabSsh)) { throw "SSH not ready on $Name" }
  Invoke-GpuLabBootstrap
  Write-Host "Bootstrap complete on $Name"
  exit 0
}

if ($Status) {
  $st = Get-InstanceStatus
  Write-Host "INSTANCE=$Name STATUS=$st ZONE=$Zone PROJECT=$Project"
  if ($st -ne "NOT_FOUND") {
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    gcloud compute instances describe $Name --zone=$Zone --project=$Project `
      --format="table(name,machineType.basename(),status,networkInterfaces[0].accessConfigs[0].natIP:label=EXTERNAL_IP,scheduling.provisioningModel,guestAccelerators[0].acceleratorType)"
    $ErrorActionPreference = $prevEap
  }
  exit 0
}

if ($Create) {
  $existing = Get-InstanceStatus
  if ($existing -ne "NOT_FOUND") {
    if ($Recreate) {
      Write-Host "Deleting existing $Name ..."
      Invoke-Gcloud -GcloudArgs @("compute", "instances", "delete", $Name, "--zone=$Zone", "--project=$Project", "--quiet")
    } else {
      throw "Instance '$Name' already exists. Use -Recreate or pnpm run gpu-lab:delete"
    }
  }

  $machineType = if ($L4) { "g2-standard-4" } else { "n1-standard-4" }
  $acceleratorType = if ($L4) { "nvidia-l4" } else { "nvidia-tesla-t4" }
  $imageFamily = "common-cu129-ubuntu-2204-nvidia-580"
  $imageProject = "deeplearning-platform-release"

  $createArgs = @(
    "compute", "instances", "create", $Name,
    "--project=$Project",
    "--zone=$Zone",
    "--machine-type=$machineType",
    "--accelerator", "type=$acceleratorType,count=1",
    "--maintenance-policy=TERMINATE",
    "--boot-disk-size=100GB",
    "--boot-disk-type=pd-balanced",
    "--image-family=$imageFamily",
    "--image-project=$imageProject",
    "--metadata=install-nvidia-driver=True",
    "--scopes=https://www.googleapis.com/auth/cloud-platform"
  )

  if (-not $OnDemand) {
    $createArgs += @(
      "--provisioning-model=SPOT",
      "--instance-termination-action=STOP"
    )
  }

  Write-Host "Creating GPU lab VM ($machineType + type=$acceleratorType,count=1, spot=$(-not $OnDemand)) ..."
  if (-not (Test-GpuLabQuota)) { exit 2 }
  Invoke-Gcloud -GcloudArgs $createArgs

  if (-not (Wait-GpuLabSsh)) { throw "SSH not ready on $Name after create" }

  if (Test-GpuLabWindowsClient) {
    Write-Host "Created $Name. Run: pnpm run gpu-lab:prep && pnpm run gpu-lab:gce"
  } else {
    Invoke-GpuLabBootstrap
    Write-Host "Created $Name. Run: pnpm run gpu-lab:prep && pnpm run gpu-lab:sync"
  }
  exit 0
}

if ($Start) {
  Invoke-Gcloud -GcloudArgs @("compute", "instances", "start", $Name, "--zone=$Zone", "--project=$Project")
  Start-GpuLabAutoStop -Reason "start"
  exit 0
}

if ($Stop) {
  Invoke-Gcloud -GcloudArgs @("compute", "instances", "stop", $Name, "--zone=$Zone", "--project=$Project")
  Write-Host "Stopped $Name (disk retained; no GPU/compute charge while stopped)"
  exit 0
}

if ($Delete) {
  Invoke-Gcloud -GcloudArgs @("compute", "instances", "delete", $Name, "--zone=$Zone", "--project=$Project", "--quiet")
  exit 0
}

if ($Ssh) {
  Assert-NotWindowsDirectGpuOps -Op "SSH"
  & gcloud compute ssh $Name --zone=$Zone --project=$Project @sshExtra
  exit $LASTEXITCODE
}

if ($Sync) {
  Assert-NotWindowsDirectGpuOps -Op "Sync"
  $st = Get-InstanceStatus
  if ($st -ne "RUNNING") { throw "Instance $Name is $st - run pnpm run gpu-lab:start first" }

  $manifest = Join-Path $repoRoot "reports/web-llm/lora/train-manifest.v1.json"
  if (-not (Test-Path $manifest)) {
    throw "Missing $manifest - run pnpm run gpu-lab:prep first"
  }

  $remoteMk = "mkdir -p ~/chrysalis-gpu-lab/reports/web-llm/lora ~/chrysalis-gpu-lab/reports/web-llm/dataset ~/chrysalis-gpu-lab/scripts"
  $gcloudArgs = @("compute", "ssh", $Name, "--zone=$Zone", "--project=$Project") + @(Get-GpuLabSshFlagArgs) + $sshExtra + @("--command", $remoteMk)
  Invoke-Gcloud -GcloudArgs $gcloudArgs

  $files = @(
    @{ Local = $manifest; Remote = "${Name}:~/chrysalis-gpu-lab/reports/web-llm/lora/train-manifest.v1.json" },
    @{ Local = (Join-Path $repoRoot "reports/web-llm/dataset/training-shards.v1.jsonl"); Remote = "${Name}:~/chrysalis-gpu-lab/reports/web-llm/dataset/training-shards.v1.jsonl" },
    @{ Local = (Join-Path $PSScriptRoot "gce-gpu-lora-train.sh"); Remote = "${Name}:~/chrysalis-gpu-lab/scripts/gce-gpu-lora-train.sh" }
  )
  foreach ($f in $files) {
    if (-not (Test-Path $f.Local)) { throw "Missing $($f.Local)" }
    Invoke-GcloudScp -Local $f.Local -Remote $f.Remote
  }

  $chmodArgs = @(
    "compute", "ssh", $Name, "--zone=$Zone", "--project=$Project"
  ) + @(Get-GpuLabSshFlagArgs) + $sshExtra + @("--command", "chmod +x ~/chrysalis-gpu-lab/scripts/gce-gpu-lora-train.sh")
  Invoke-Gcloud -GcloudArgs $chmodArgs
  Write-Host "Synced manifest + dataset + train script to ~/chrysalis-gpu-lab on $Name"
  exit 0
}

if ($Train) {
  Assert-NotWindowsDirectGpuOps -Op "Train"
  $st = Get-InstanceStatus
  if ($st -ne "RUNNING") { throw "Instance $Name is $st - run pnpm run gpu-lab:start first" }
  Start-GpuLabAutoStop -Reason "train"
  $sshTimeoutSec = ($MaxMinutes * 60) + 120
  $cmd = "export CHRYSALIS_GPU_LAB_MAX_MINUTES=$MaxMinutes; bash ~/chrysalis-gpu-lab/scripts/gce-gpu-lora-train.sh"
  $gcloudArgs = @(
    "compute", "ssh", $Name, "--zone=$Zone", "--project=$Project"
  ) + @(Get-GpuLabTrainSshFlagArgs) + $sshExtra + @("--command", $cmd, "--quiet", "--ssh-timeout=${sshTimeoutSec}s")
  Invoke-Gcloud -GcloudArgs $gcloudArgs
  if (Get-GpuLabAutoStopEnabled) {
    Write-Host "Train SSH finished. VM auto-stop still scheduled within ${MaxMinutes} min of train start unless already stopped."
  }
  exit 0
}
