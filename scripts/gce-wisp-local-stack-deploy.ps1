<#
.SYNOPSIS
  Deploy WISP CWL chimera gateway to chrysalis-test-vm (front VM only).

.PARAMETER BackendUrl
  Existing WISP backend-services base URL (unchanged operator stack).
  Default: https://hss.wisptools.io (nginx → backend :3001)

.PARAMETER SvelteFallback
  Optional SvelteKit preview URL on VM A for holed UI routes.

.EXAMPLE
  .\scripts\gce-wisp-local-stack-deploy.ps1 -Project chrysalis-dev-f5x6qv -BackendUrl http://10.128.0.5:3001
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $Project,
  [string] $Zone = "us-central1-a",
  [string] $Name = "chrysalis-test-vm",
  [string] $WispModuleDir = "C:\Users\david\AgenticOps\products\wisptools\Module_Manager",
  [string] $BackendUrl = "https://hss.wisptools.io",
  [string] $SvelteFallback = "http://127.0.0.1:3000",
  [int] $Port = 19100,
  [switch] $TunnelThroughIap,
  [switch] $SkipLift,
  [switch] $SkipSvelteSidecar
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot "gce-auth-activate.ps1") | Out-Null
$sshExtra = @()
if ($TunnelThroughIap) { $sshExtra = @("--tunnel-through-iap") }

$WispModuleDir = (Resolve-Path $WispModuleDir).Path
Push-Location $repoRoot
try {
  if (-not $SkipLift) {
    Write-Host "Lift + CWL emit..."
    & node scripts/hub-ingest/lift-to-webir.mjs $WispModuleDir --language svelte
    & node scripts/hub-ingest/emit-cwl-from-hub.mjs $WispModuleDir --origin svelte
  }
  & node scripts/wisp-cwl-pipeline.mjs --bundle-only --skip-lift --root $WispModuleDir

  $bundleDir = Join-Path $repoRoot "generated\_wisp-cwl-poc-deploy"

  if (-not $SkipSvelteSidecar) {
    Write-Host "Building WISP Svelte sidecar (same-origin /api via chimera)..."
    & node scripts/wisp-cwl-svelte-sidecar-build.mjs --root $WispModuleDir
    $sidecarBundle = Join-Path $repoRoot "generated\wisp-svelte-sidecar\bundle"
    $sidecarTar = Join-Path $env:TEMP ("wisp-svelte-sidecar-" + [guid]::NewGuid().ToString("n") + ".tar.gz")
    Push-Location $sidecarBundle
    tar -czf $sidecarTar .
    Pop-Location
    $sidecarBootstrap = Join-Path $PSScriptRoot "gce-wisp-svelte-sidecar-bootstrap.sh"
    & gcloud compute scp --zone=$Zone --project=$Project @sshExtra $sidecarTar "${Name}:wisp-svelte-sidecar.tgz"
    & gcloud compute scp --zone=$Zone --project=$Project @sshExtra $sidecarBootstrap "${Name}:gce-wisp-svelte-sidecar-bootstrap.sh"
    Remove-Item -LiteralPath $sidecarTar -Force -ErrorAction SilentlyContinue
  }

  $tarball = Join-Path $env:TEMP ("wisp-cwl-stack-" + [guid]::NewGuid().ToString("n") + ".tar.gz")
  Push-Location $bundleDir
  $tarFiles = @(
    "routes.cwl", "api-proxy.cwl", "cwl-preview.json",
    "wisp-cwl-chimera-gateway.mjs", "wisp-cwl-chimera-serve.mjs", "wisp-cwl-gateway-config.mjs",
    "wisp-cwl-post-g7790.mjs", "wisp-pipeline.config.json", "favicon.svg",
    "wisp-cwl-login.css", "wisp-cwl-app.css", "wisp-cwl-client.js", "wisp-firebase-config.json",
    "wisp-cwl-modules.css", "wisp-cwl-modules.js", "wisp-cwl-map.js",
    "wisp-cwl-map-island.css", "wisp-cwl-arcgis.bundle.js", "wisp-cwl-arcgis.bundle.css",
    "wisp-arcgis-config.json",
    "wisptools-logo.svg", "routes.webir.json", "api-proxy.webir.json",
    "wisp-cwl-original-css-map.json", "original-css", "lib"
  )
  $present = $tarFiles | Where-Object { Test-Path $_ }
  tar -czf $tarball @present
  if ($LASTEXITCODE -ne 0) {
    $present = @("routes.cwl", "api-proxy.cwl", "wisp-cwl-chimera-gateway.mjs", "wisp-cwl-gateway-config.mjs", "wisp-cwl-post-g7790.mjs", "wisp-pipeline.config.json") | Where-Object { Test-Path $_ }
    tar -czf $tarball @present
  }
  Pop-Location

  $bootstrap = Join-Path $PSScriptRoot "gce-wisp-chimera-bootstrap.sh"
  & gcloud compute scp --zone=$Zone --project=$Project @sshExtra $tarball "${Name}:wisp-cwl-poc.tgz"
  & gcloud compute scp --zone=$Zone --project=$Project @sshExtra $bootstrap "${Name}:gce-wisp-chimera-bootstrap.sh"
  Remove-Item -LiteralPath $tarball -Force -ErrorAction SilentlyContinue

  $fwName = "chrysalis-wisp-cwl-$Port"
  $prevEa = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  $null = gcloud compute firewall-rules describe $fwName --project=$Project 2>&1
  $fwExists = ($LASTEXITCODE -eq 0)
  $ErrorActionPreference = $prevEa
  if (-not $fwExists) {
    & gcloud compute firewall-rules create $fwName --project=$Project --direction=INGRESS --priority=1000 --network=default --action=ALLOW --rules="tcp:$Port" --source-ranges="0.0.0.0/0" --target-tags="http-server"
  }

  $nativePrefixes = "/docs,/help,/favicon.ico,/favicon.svg"
  $svelteEnv = if (-not $SkipSvelteSidecar) {
    "export WISP_SVELTE_FALLBACK='$SvelteFallback'; export WISP_CWL_NATIVE_PREFIXES='$nativePrefixes';"
  } else {
    "export WISP_CWL_NATIVE_PREFIXES='*';"
  }
  $sidecarSetup = if (-not $SkipSvelteSidecar) {
    "mkdir -p ~/wisp-svelte-sidecar; tar -xzf ~/wisp-svelte-sidecar.tgz -C ~/wisp-svelte-sidecar; chmod +x ~/gce-wisp-svelte-sidecar-bootstrap.sh; ~/gce-wisp-svelte-sidecar-bootstrap.sh;"
  } else { "" }
  $remoteCmd = "set -e; ${sidecarSetup} mkdir -p ~/wisp-cwl-poc; tar -xzf ~/wisp-cwl-poc.tgz -C ~/wisp-cwl-poc; chmod +x ~/gce-wisp-chimera-bootstrap.sh; export WISP_BACKEND_URL='$BackendUrl'; export WISP_CWL_POC_PORT=$Port; $svelteEnv ~/gce-wisp-chimera-bootstrap.sh"
  Write-Host "Starting chimera gateway on ${Name}..."
  Invoke-ChrysalisGceSsh -Name $Name -Zone $Zone -Project $Project -Extra $sshExtra -Command $remoteCmd

  $ip = (& gcloud compute instances describe $Name --zone=$Zone --project=$Project --format="get(networkInterfaces[0].accessConfigs[0].natIP)" 2>$null | Out-String).Trim()
  $baseUrl = "http://${ip}:${Port}"
  Write-Host "Veracity probe $baseUrl"
  Start-Sleep -Seconds 2
  & node scripts/wisp-cwl-poc-verify.mjs --base-url $baseUrl --chimera --preview (Join-Path $bundleDir "cwl-preview.json")

  Write-Host ""
  Write-Host "=== WISP local stack (front VM) deployed ==="
  Write-Host "URL:      $baseUrl"
  Write-Host "Backend:  $BackendUrl (existing stack - not deployed by this script)"
  Write-Host "Docs:     ${baseUrl}/docs"
  Write-Host "API:      ${baseUrl}/api/* (proxied to backend)"
}
finally {
  Pop-Location
}
