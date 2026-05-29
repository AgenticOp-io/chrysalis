# Shared hub/strategic verify suite (Windows GCE or local PowerShell).
$ErrorActionPreference = "Stop"
$repoRoot = if ($env:CHRYSALIS_STATUS_REPO) { $env:CHRYSALIS_STATUS_REPO } else { Join-Path $PSScriptRoot ".." }
Set-Location $repoRoot

function Run-Step([string]$Name, [scriptblock]$Block) {
  Write-Host "[gce-vm-verify] $Name ..."
  & $Block
  if ($LASTEXITCODE -ne 0) { throw "$Name failed (exit $LASTEXITCODE)" }
}

Run-Step "pnpm install" { pnpm install }
Run-Step "pnpm -r build" { pnpm -r build }

$env:CHRYSALIS_SKIP_PARSER_VENDOR = if (Get-Command php -ErrorAction SilentlyContinue) { "0" } else { "1" }
if ($env:CHRYSALIS_SKIP_PARSER_VENDOR -eq "0") {
  Run-Step "vendor:parser-bridge" { pnpm run vendor:parser-bridge }
}

Run-Step "hub-strategic tests" {
  pnpm exec vitest run packages/cli/tests/hub-strategic.test.ts packages/cli/tests/hub-gold-manifest.test.ts
}
Run-Step "hub:express-flagship" { pnpm run hub:express-flagship }
Run-Step "hub:plain-php-flagship" { pnpm run hub:plain-php-flagship }
Run-Step "hub:symfony-flagship" { pnpm run hub:symfony-flagship }
Run-Step "hub:node-express-oracle-verify" { pnpm run hub:node-express-oracle-verify }
Run-Step "hub:node-oracle-spike" { pnpm run hub:node-oracle-spike }

Write-Host "[gce-vm-verify] OK (Windows/local suite)"
