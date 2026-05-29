# Local + GCE verification (no GitHub Actions required)

Use your machine and optional GCE VMs instead of CI for hub/strategic gates.

## On your workstation

```bash
pnpm -r build
pnpm exec vitest run packages/cli/tests/hub-strategic.test.ts packages/cli/tests/hub-gold-manifest.test.ts
pnpm run ci:hub-completion
pnpm run hub:express-flagship
```

PowerShell (same repo):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/gce-vm-verify-suite.ps1
```

## Linux GCE VM (Debian)

Requires `gcloud` auth and project billing.

```powershell
.\scripts\gce-test-vm-refresh.ps1 -Project chrysalis-dev-f5x6qv
gcloud compute ssh chrysalis-test-vm --zone=us-central1-a --project=chrysalis-dev-f5x6qv --command="CHRYSALIS_STATUS_REPO=~/chrysalis-test bash ~/chrysalis-test/scripts/gce-vm-verify-suite.sh"
```

Or:

```powershell
pnpm run verify:gce:linux -- -Project chrysalis-dev-f5x6qv
```

## Windows GCE VM

```powershell
.\scripts\gce-test-vm-windows.ps1 -Project chrysalis-dev-f5x6qv -DeployFromLocalGit
```

Or:

```powershell
pnpm run verify:gce:windows -- -Project chrysalis-dev-f5x6qv
```

## Both platforms (orchestrator)

Uploads current `git HEAD`, runs the same verify suite on Linux + Windows, writes `reports/ci/gce-cross-platform-verify.json`:

```powershell
pnpm run verify:gce -- -Project chrysalis-dev-f5x6qv
```

Optional: `-TunnelThroughIap` when SSH must use IAP.

Hub operator deploy (separate from verify suite): `pnpm run deploy:hub-demo`
