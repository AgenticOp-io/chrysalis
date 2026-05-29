# Bootstrap Chrysalis on a Windows GCE VM (uploaded to ~ then run via gcloud ssh).
$ErrorActionPreference = "Stop"
$WorkDir = Join-Path $env:USERPROFILE "chrysalis-test"
$Tarball = Join-Path $env:USERPROFILE "chrysalis-src.tgz"

function Ensure-Node {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if ($node -and (node -v) -match "^v20\.") {
    Write-Host "[gce-windows-bootstrap] node: $(node -v)"
    return
  }
  Write-Host "[gce-windows-bootstrap] installing Node 20 LTS..."
  $msi = Join-Path $env:TEMP "node-v20-lts-x64.msi"
  Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.18.3/node-v20.18.3-x64.msi" -OutFile $msi
  Start-Process msiexec.exe -Wait -ArgumentList "/i", $msi, "/quiet"
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
    [System.Environment]::GetEnvironmentVariable("Path", "User")
}

function Ensure-Pnpm {
  corepack enable 2>$null
  corepack prepare pnpm@9.0.0 --activate
  if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    npm install -g pnpm@9.0.0
  }
  Write-Host "[gce-windows-bootstrap] pnpm: $(pnpm -v)"
}

Ensure-Node
Ensure-Pnpm

if (-not (Test-Path $Tarball)) {
  throw "Missing tarball: $Tarball (upload chrysalis-src.tgz first)"
}

if (Test-Path $WorkDir) { Remove-Item -Recurse -Force $WorkDir }
New-Item -ItemType Directory -Path $WorkDir | Out-Null
tar -xzf $Tarball -C $WorkDir

$env:CHRYSALIS_STATUS_REPO = $WorkDir
$verifySuite = Join-Path $WorkDir "scripts\gce-vm-verify-suite.ps1"
if (-not (Test-Path $verifySuite)) {
  throw "Missing $verifySuite after extract"
}

powershell -ExecutionPolicy Bypass -File $verifySuite
Write-Host "[gce-windows-bootstrap] OK"
