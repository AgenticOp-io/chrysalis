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
pnpm run test:gce:wait     # poll until OK (auto-fetch) or failure
pnpm run test:gce:watch:detach   # log every 10s to reports/ci/gce-watch.log (non-blocking)
pnpm run test:gce:log            # tail the watch log; use test:gce:log:follow to stream
```

**Watch log (recommended):** `test:gce:watch:detach` SSH-probes the VM every **10s** and appends one line per poll (`status=RUNNING|OK|FAILED`, pid, phase, fail path). Failures include a tail excerpt in the log — no need to block for hours. Set **`CHRYSALIS_GCE_WATCH_INTERVAL_SEC`** to change the interval.

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
| CWL | `scripts/gce-hub-cwl-vitest.sh` (RFC/parser smokes; batch smokes skipped) |
| Authoring batches | `scripts/gce-hub-authoring-batch-vitest.sh` (v61–v110; mega gates v106–v110) |
| WPTP siblings | `scripts/gce-ensure-wptp-matrix.sh` (`~/wptp-matrix`, `~/wptp-emit-nextjs`; skip with `CHRYSALIS_SKIP_WPTP_MATRIX=1`) |
| Gold gates | `scripts/gce-hub-gold-gates.sh` (structural gold + trace replay; artifacts reused by hub-completion) |
| Completion | `pnpm run ci:hub-completion` |
| CWL HTTP | `hub-cwl-fullstack-verify-http-smoke` |
| CWL batches | fast v40 + v60 composite |

Optional full workspace Vitest (slow):

```powershell
.\scripts\gce-run-all-tests.ps1 -Project chrysalis-dev-f5x6qv -Detach -FullVitest
```

Logs: `~/chrysalis-test/reports/ci/gce-all-tests.log`  
Per-phase logs: `reports/ci/gce-phase-*.log` (line-buffered; tail these when the main log looks stuck)  
Progress JSON: `reports/ci/gce-progress.json` (updated at each phase start/end; shown by `test:gce:status`)  
Success marker: `~/chrysalis-test/reports/ci/gce-all-tests.ok`

**Resume partial runs** (when earlier phases already passed on the VM):

```bash
bash scripts/gce-resume-from-gold-gates.sh      # gold gates onward
bash scripts/gce-resume-from-hub-completion.sh  # hub-completion onward
```

**Windows local gold artifacts:** capture subprocess stdout with Node (`writeFileSync` / `spawnSync`), not PowerShell `Tee-Object` or `>` — those write UTF-16 and break `require()` of JSON. On Linux/GCE, `scripts/gce-hub-gold-gates.sh` is fine.

**Hub-completion troubleshooting:** `node scripts/hub-ingest/hub-completion.mjs --list-smokes` lists deferred smoke ids; phase logs go to stderr as `[hub-completion] phase: …`.

**hub-strategic on GCE:** batch smokes and flagship subprocess tests are **skipped** in vitest (`CHRYSALIS_GCE_SLIM_HUB_STRATEGIC=1`); the same work runs via dedicated `hub:*` scripts and later GCE phases. **`scripts/gce-ensure-fixture-emits.sh`** materializes gitignored `fixtures/**/generated/` before vitest. Full file: `CHRYSALIS_GCE_RUN_HUB_STRATEGIC=1`.

**hub-completion on GCE:** after authoring vitest, **`gce-hub-gold-gates.sh`** runs structural gold + trace replay once; **`ci:hub-completion`** reuses those artifacts under the fast path (`CHRYSALIS_GCE_HUB_COMPLETION_FAST=1`, default with **`CHRYSALIS_GCE_ALL_TESTS`**) and defers duplicate batches with **`gce-deferred-hub-completion-fast`**. Megas run in dedicated **`cwl-batch-v106` / `v107` / `v110`** phases (**DESIGN D2269**, **D2270**).

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
