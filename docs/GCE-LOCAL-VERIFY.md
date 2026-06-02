# GCE test runner (default)

**Run Chrysalis tests on `chrysalis-test-vm` (Linux), not on a laptop that may sleep.**

Prerequisites: `gcloud auth login`, project **`chrysalis-dev-f5x6qv`** (or set **`CHRYSALIS_GCE_PROJECT`**).

## One command (recommended)

Uploads local **`git HEAD`**, copies runner scripts from your workspace (so uncommitted runner changes still apply), starts the full suite **detached** on the VM, and returns immediately:

```powershell
pnpm run test:gce
```

Check progress (any machine with gcloud):

```powershell
pnpm run test:gce:status
```

When **`STATUS: OK`** appears, pull artifacts:

```powershell
pnpm run test:gce:fetch
```

Foreground run (SSH stays open until done; auto-fetches reports):

```powershell
pnpm run test:gce:foreground
```

## What runs on the VM

Script: `scripts/gce-run-all-tests.sh`

| Phase | Content |
| --- | --- |
| Build | `pnpm install`, `pnpm -r build`, parser-bridge vendor (if `php` on VM) |
| Shims | `pnpm run test:cli-shims` |
| Hub suite | `scripts/gce-vm-verify-suite.sh` (strategic vitest, flagships, node oracle) |
| CWL | `packages/cli/tests/hub-cwl.test.ts` |
| Completion | `pnpm run ci:hub-completion` |
| CWL HTTP | `hub-cwl-fullstack-verify-http-smoke` |
| CWL batches | fast v40 + v60 composite |

Optional full workspace Vitest (slow):

```powershell
.\scripts\gce-run-all-tests.ps1 -Project chrysalis-dev-f5x6qv -Detach -FullVitest
```

Logs: `~/chrysalis-test/reports/ci/gce-all-tests.log`  
Per-phase logs: `reports/ci/gce-phase-*.log` (line-buffered; tail these when the main log looks stuck)  
Success marker: `~/chrysalis-test/reports/ci/gce-all-tests.ok`

**hub-strategic on GCE:** batch smokes and flagship subprocess tests are **skipped** in vitest (`CHRYSALIS_GCE_SLIM_HUB_STRATEGIC=1`); the same work runs via dedicated `hub:*` scripts and `ci:hub-completion`. **`scripts/gce-ensure-fixture-emits.sh`** materializes gitignored `fixtures/**/generated/` before vitest. Full file: `CHRYSALIS_GCE_RUN_HUB_STRATEGIC=1`.

Env on VM: **`NODE_OPTIONS=--disable-warning=ExperimentalWarning`**, **`CHRYSALIS_HUB_CWL_BATCH_FAST_CHAIN=1`**.

## Refresh code only

```powershell
.\scripts\gce-test-vm-refresh.ps1 -Project chrysalis-dev-f5x6qv -SkipHubFinish
```

## Cross-platform verify (Linux + Windows VMs)

```powershell
pnpm run verify:gce -- -Project chrysalis-dev-f5x6qv
```

## Local workstation (fallback)

Use only for quick edits; long jobs belong on GCE:

```powershell
pnpm run run:cwl-batch-v40-fast
```

Hub operator deploy: `pnpm run deploy:hub-demo`
