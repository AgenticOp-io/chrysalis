<#
.SYNOPSIS
  Copy a GCE VM from one GCP project to another using snapshot + image (same zone by default).

.DESCRIPTION
  GCP does not offer a single "move instance" API across projects. This script:
  1) Verifies target project has billing (required for Compute in a new project).
  2) Creates a disk snapshot of the boot disk (VM can stay RUNNING for standard PD).
  3) Creates a global image from that snapshot in the SOURCE project.
  4) Grants the TARGET project's default Compute Engine SA `roles/compute.imageUser` on that image.
  5) Enables Compute API on the target (if you have permission).
  6) Creates a new instance in the TARGET project from the image.

  After you validate the new VM, delete the old one manually (or add -DeleteSourceInstance after review).

.PARAMETER SourceProject
  Project id that currently hosts the VM (e.g. lte-pci-mapper-65450042-bbf71).

.PARAMETER TargetProject
  Destination project id (e.g. agenticop-io).

.PARAMETER Instance
  VM name.

.PARAMETER Zone
  Zone of the VM and of the new instance (default us-central1-a).

.PARAMETER NewInstanceName
  Name for the VM in the target project (default: same as Instance).

.PARAMETER MachineType
  Machine type for the new VM (default e2-micro).

.EXAMPLE
  .\scripts\gcp-migrate-gce-vm.ps1 -SourceProject lte-pci-mapper-65450042-bbf71 -TargetProject agenticop-io -Instance acs-hss-server
#>
param(
  [Parameter(Mandatory = $true)][string] $SourceProject,
  [Parameter(Mandatory = $true)][string] $TargetProject,
  [Parameter(Mandatory = $true)][string] $Instance,
  [string] $Zone = "us-central1-a",
  [string] $NewInstanceName = "",
  [string] $MachineType = "e2-micro"
)

$ErrorActionPreference = "Stop"
$env:CLOUDSDK_CORE_DISABLE_PROMPTS = "1"
if (-not $NewInstanceName) { $NewInstanceName = $Instance }

$snap = "migrate-$Instance-snap"
$img = "migrate-$Instance-img"

function Invoke-Gcloud {
  param([string[]] $GcloudArgs)
  & gcloud @GcloudArgs
  if ($LASTEXITCODE -ne 0) { throw "gcloud failed: gcloud $($GcloudArgs -join ' ')" }
}

function Require-Billing([string] $Project) {
  $b = gcloud billing projects describe $Project --format="value(billingEnabled)" 2>$null
  if ($b -ne "True") {
    throw "Project '$Project' has no active billing (billingEnabled=$b). Link a billing account in Console, then retry."
  }
}

Require-Billing $TargetProject

$diskUrl = gcloud compute instances describe $Instance --zone=$Zone --project=$SourceProject --format="value(disks[0].source)" 2>$null
if (-not $diskUrl) { throw "Could not read boot disk for instance $Instance" }
$diskName = $diskUrl.Split("/")[-1]
Write-Host "Boot disk: $diskName"

Write-Host "Creating snapshot $snap ..."
Invoke-Gcloud @("compute", "disks", "snapshot", $diskName, "--snapshot-names=$snap", "--zone=$Zone", "--project=$SourceProject")

Write-Host "Creating image $img from snapshot..."
Invoke-Gcloud @("compute", "images", "create", $img, "--source-snapshot=$snap", "--project=$SourceProject", "--storage-location=us")

$targetNum = gcloud projects describe $TargetProject --format="value(projectNumber)" 2>$null
$targetSa = "${targetNum}-compute@developer.gserviceaccount.com"
Write-Host "Granting imageUser on $img to $targetSa ..."
Invoke-Gcloud @(
  "compute", "images", "add-iam-policy-binding", $img,
  "--project=$SourceProject",
  "--member=serviceAccount:$targetSa",
  "--role=roles/compute.imageUser",
  "--condition=None"
)

Write-Host "Enabling Compute API on target (if needed)..."
gcloud services enable compute.googleapis.com --project=$TargetProject 2>&1 | Out-Null

Write-Host "Creating instance $NewInstanceName in $TargetProject ..."
Invoke-Gcloud @(
  "compute", "instances", "create", $NewInstanceName,
  "--zone=$Zone",
  "--project=$TargetProject",
  "--machine-type=$MachineType",
  "--image=$img",
  "--image-project=$SourceProject",
  "--network=default"
)

Write-Host ""
Write-Host "Done. Validate the new VM, then remove the old one when ready:"
Write-Host "  gcloud compute instances delete $Instance --zone=$Zone --project=$SourceProject"
Write-Host "Optional cleanup in source project after delete:"
Write-Host "  gcloud compute images delete $img --project=$SourceProject --quiet"
Write-Host "  gcloud compute snapshots delete $snap --project=$SourceProject --quiet"
