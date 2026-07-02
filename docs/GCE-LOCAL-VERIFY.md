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

## Phase 8 strict product proof (GCE only)

Strict close smoke (`CHRYSALIS_STRICT_STRATEGIC_PLAN=1`) must run on **`chrysalis-test-vm`**, not on Windows (shared fixture locks). Do **not** run `hub:strategic-plan-phase8-product-proof-close-smoke` with strict env locally.

```powershell
pnpm run test:gce:phase8-strict          # refresh VM + detached run
pnpm run test:gce:phase8-strict:status   # OK marker + log tail
pnpm run test:gce:phase8-strict:foreground   # block until done
```

Log: `reports/ci/gce-phase8-strict.log` on the VM. OK marker: `reports/ci/gce-phase8-strict.ok`.

## Migration OS close (GCE only)

Fast slice for **G8560** + **G8550** + **G8290** + **G8310** + **G8570** without the full mega suite:

```powershell
pnpm run test:gce:migration-os
pnpm run test:gce:migration-os:status
pnpm run test:gce:migration-os:foreground   # block until done
```

Live WISP G8320 probes on the VM: **`pnpm run test:gce:migration-os:wisp-live`**, pass **`-WispLive`** to the ps1 script, or set **`CHRYSALIS_GCE_WISP_LIVE=1`** on the VM.

Log: `reports/ci/gce-migration-os-run.log` · OK marker: `reports/ci/gce-migration-os.ok`

Fetch operator HTML hubs from the VM (migration evidence, IS, web-LLM POC, nightly):

```powershell
pnpm run test:gce:fetch:operator-hubs
# or: CHRYSALIS_GCE_FETCH_OPERATOR_HUBS=1 pnpm run test:gce:fetch
```

Foreground `test:gce:migration-os` fetches CI logs **and** operator hubs automatically.

## What runs on the VM

Script: `scripts/gce-run-all-tests.sh` — each row is a separate **`gce-run-phase`** (own log + progress entry). List all phase ids: `CHRYSALIS_GCE_LIST_PHASES=1 bash scripts/gce-run-all-tests.sh`.

| Phase id(s) | Content |
| --- | --- |
| Build | `pnpm install`, `pnpm -r build`, parser-bridge vendor (if `php` on VM) |
| `cli-shims` | `pnpm run test:cli-shims` |
| `hub-strategic-vitest` … `hub-node-oracle-spike` | Six hub verify chunks (was monolithic `gce-vm-verify-suite.sh`) |
| `strategic-plan-phase8-strict` | Phase 8 product proof without `SKIP_*` (also: `pnpm run test:gce:phase8-strict`) |
| `hub-cwl` | `scripts/gce-hub-cwl-vitest.sh` |
| `hub-cwl-authoring-v61-v63` … `v91-v110` | Four vitest files (was one `gce-hub-authoring-batch-vitest.sh` phase) |
| `wptp-matrix` | `scripts/gce-ensure-wptp-matrix.sh` |
| `hub-gold-verify`, `hub-gold-trace-replay` | Split gold gates (trace replay no longer silent inside one phase) |
| `hub-completion-json`, `hub-completion-gate`, `hub-knowledge` | Split `ci:hub-completion` (was one phase) |
| `cwl-http-verify` | fullstack HTTP smoke |
| `cwl-batch-v40` | gate-only v40 (`skipPriorChain`; ~minutes not hours) |
| `cwl-batch-v60` | post50 composite (`skipPriorChain`) |
| `cwl-v106-*` (7 phases) | oracle product ultra — one sub-batch per phase (resume-friendly) |
| `cwl-v107-*` (3 phases) | verify standalone mega slices |
| `cwl-v110-verify-gaps-parallel`, `cwl-v110-migration-mega` | graduation lock (oracle/verify megas skipped on GCE — already covered by v106/v107 slices; set `CHRYSALIS_GCE_V110_SKIP_REPEAT_MEGAS=0` to re-run) |
| `post110-verify-gaps` | hub verify-gaps B1–B5 reinforcement (**green 2026-06-16**); HTTP verify uses **`hub-verify-http-probe-worker.mjs`** subprocess (avoids tsx hang on fastify) |
| `intelligence-shorthand-close` | **G8560** IS-T3/T4/T5 export + hub (**CPU only**). Skip: `CHRYSALIS_GCE_INTELLIGENCE_SHORTHAND=0` |
| `is-runtime-close` | **G8600** IS tier retrieval + skip-LLM routing (**CPU only**) |
| `migration-os-close` | **G8550** Migration OS composite (evidence + open legacy + VMF hub + IS). Skip block: `CHRYSALIS_GCE_MIGRATION_OS=0` |
| `open-web-llm-close` | **G8290** web-LLM framework close (part of Migration OS block) |
| `wisp-web-llm-poc-close` | **G8310** WISP + web-LLM unified POC. Live G8320 probes: `CHRYSALIS_GCE_WISP_LIVE=1` on VM |
| `open-legacy-wedge` | **G8570** WordPress vertical wedge (part of Migration OS block) |
| `migration-evidence-hub-refresh` | Rebuild evidence hub after nightly + IS artifacts exist |

Long smokes emit **`[chrysalis-smoke:scope] ISO8601 start|ok|FAIL|defer …`** lines to stderr (captured in `gce-phase-*.log` via `2>&1 tee`). Silence with `CHRYSALIS_HUB_SMOKE_PROGRESS=0`.

Full phase id list: `node scripts/gce-phase-list.mjs csv` (**46** phases by default; includes **G8560** / **G8600** / Migration OS close **G8550** / **G8290** / **G8310** / **G8570**).

**In-flight run on old manifest:** if progress shows legacy `cwl-batch-v106` (monolith), let it finish or stop it, sync scripts, then `node scripts/gce-progress.mjs bootstrap "$(node scripts/gce-phase-list.mjs csv)"` and `bash scripts/gce-resume-from-mega-phases.sh`.

Optional full workspace Vitest (slow):

```powershell
.\scripts\gce-run-all-tests.ps1 -Project chrysalis-dev-f5x6qv -Detach -FullVitest
```

Logs: `~/chrysalis-test/reports/ci/gce-all-tests.log`  
Per-phase logs: `reports/ci/gce-phase-*.log` (line-buffered; tail these when the main log looks stuck)  
Progress JSON: `reports/ci/gce-progress.json` — full phase manifest (schema v2) with `completedCount` / `totalPhases`. Human summary: `node scripts/gce-progress.mjs summary` (shown by `test:gce:status`).

Overnight supervisor (auto-resume on failure, fetch on success):

```powershell
pnpm run test:gce:supervise
Get-Content reports/ci/gce-supervise.log -Tail 20 -Wait
```  
Success marker: `~/chrysalis-test/reports/ci/gce-all-tests.ok`

**Resume partial runs** (when earlier phases already passed on the VM):

```bash
bash scripts/gce-cleanup-vm-temp.sh              # /tmp/chrysalis-* + stale ~/chrysalis-src.tgz
bash scripts/gce-resume-from-gold-gates.sh      # gold gates onward
bash scripts/gce-resume-from-hub-completion.sh  # hub-completion onward
bash scripts/gce-resume-from-cwl-batch-v40.sh   # cwl-http + v40 + v60 onward
bash scripts/gce-resume-from-mega-phases.sh     # v106/v107/v110 sub-phases only (after v60)
node scripts/gce-progress.mjs pick-resume       # choose script from gce-progress.json
```

**Windows local gold artifacts:** capture subprocess stdout with Node (`writeFileSync` / `spawnSync`), not PowerShell `Tee-Object` or `>` — those write UTF-16 and break `require()` of JSON. On Linux/GCE, `scripts/gce-hub-gold-gates.sh` is fine.

**Hub-completion troubleshooting:** `node scripts/hub-ingest/hub-completion.mjs --list-smokes` lists deferred smoke ids; phase logs go to stderr as `[hub-completion] phase: …`.

**hub-strategic on GCE:** batch smokes and flagship subprocess tests are **skipped** in vitest (`CHRYSALIS_GCE_SLIM_HUB_STRATEGIC=1`); the same work runs via dedicated `hub:*` scripts and later GCE phases. **`scripts/gce-ensure-fixture-emits.sh`** materializes gitignored `fixtures/**/generated/` before vitest. Full file: `CHRYSALIS_GCE_RUN_HUB_STRATEGIC=1`.

**hub-completion on GCE:** after authoring vitest, **`hub-gold-verify`** + **`hub-gold-trace-replay`** run as separate phases; **`hub-completion-json`** then **`hub-completion-gate`** reuse gold artifacts under the fast path (`CHRYSALIS_GCE_HUB_COMPLETION_FAST=1`). Megas run as **12 sub-phases** (`cwl-v106-*`, `cwl-v107-*`, `cwl-v110-*`) after **`cwl-batch-v60`**. v40 uses **`skipPriorChain`** (gate-only).

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
