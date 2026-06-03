# Windows vs Linux test compatibility

**Default:** run the full suite on **Linux GCE** (`pnpm run test:gce`). Use a Windows workstation for quick edits and gate-only smokes only.

Authority: **`docs/GCE-LOCAL-VERIFY.md`**, **`docs/STRATEGIC-PLAN.md`** §12 (default test execution on GCE).

---

## Quick reference

| Area | Linux (GCE / bash) | Windows (local PowerShell) | Mitigation |
| --- | --- | --- | --- |
| **Full authoring batches v64–v110** | All queues run (`gce-hub-authoring-batch-vitest.sh`; mega gates enabled) | v91–v105 gate-only vitest; **v106–v110 skipped** by default | `pnpm run test:gce` or `$env:CHRYSALIS_RUN_HUB_HEAVY_AUTHORING_BATCH='1'` |
| **v110 graduation lock** | `gce-run-all-tests.sh` phase + full vitest on GCE | Skipped locally (17 parallel gates + HTTP verify; 10–60+ min) | GCE only |
| **v106 oracle-product-ultra** | ~8–15 min on GCE | Often **>480s** timeout in vitest | Skip locally; run on GCE |
| **v107 verify-standalone-mega** | Runs on GCE | Same timeout risk as v106 | Skip locally; run on GCE |
| **v108 post90-verify-gaps-composite** | Runs on GCE | Heavy HTTP/replay bundle | Skip locally; run on GCE |
| **v109 skipPrior gate** | Full `post108-graduation` in deep chain; `evidence-trend` in gate-only | Gate-only uses fast **`evidence-trend`** (~2s) | By design for local gate-only CI |
| **Trace dir cleanup (`ENOTEMPTY`)** | Rare | **Common** when parallel HTTP verify races on `fixtures/**/traces/` | `hub-verify-http.mjs` **`rmDirRecursive`** retries (`maxRetries` + `retryDelay`) |
| **SQLite experimental warning** | Log noise | Same log noise | `NODE_OPTIONS=--disable-warning=ExperimentalWarning` (set on GCE) |
| **Git CRLF vs LF goldens** | LF checkouts | CRLF possible on Windows | `@chrysalis/webir` portable snapshot mode; ingest golden normalizes |
| **PHP on PATH** | `php` / `php3` | `php` (manual install) | `scripts/hub-ingest/shared.mjs` picks `python3` vs `python` similarly |
| **Parser-bridge vendor** | `composer` or bootstrapped `composer.phar` | Same; pretest hook | `pnpm run vendor:parser-bridge`; skip with `CHRYSALIS_SKIP_PARSER_VENDOR=1` |
| **Git credential helper** | N/A | **`credential-manager-core` is not a git command`** on push | **`docs/INSTALLATION.md`** Troubleshooting |
| **Shell heredoc commits** | `git commit -m "$(cat <<'EOF' …)"` | PowerShell has no `<<'EOF'` | Use `git commit -m "title" -m "body"` |
| **gcloud SCP remote paths** | `~/path` works | **`~/` breaks** on some Windows gcloud builds | GCE scripts use bare remote filenames (**DESIGN D412**) |
| **Signal / process cleanup** | Reliable `kill`, detached SSH | Limited signal handling | Long jobs on GCE; **`pnpm run test:gce -Detach`** |
| **hub-strategic batch smokes** | Slim on GCE (`CHRYSALIS_GCE_SLIM_HUB_STRATEGIC=1`); full via `ci:hub-completion` | Full file can run locally but slow | Match GCE slim unless debugging |
| **Parallel graduation locks** | **`Promise.all`** fan-out (**DESIGN D2254**) | Same code; wall-clock often worse | Prefer GCE for lock gates |
| **Cross-platform verify** | `chrysalis-test-vm` (Debian) | `chrysalis-test-vm-win` (Server 2022) | `pnpm run verify:gce` |

---

## Environment flags

| Variable | When set | Effect |
| --- | --- | --- |
| `CHRYSALIS_GCE_ALL_TESTS=1` | GCE `gce-run-all-tests.sh` | Enables heavy authoring batches v106–v110 in vitest |
| `CHRYSALIS_RUN_HUB_HEAVY_AUTHORING_BATCH=1` | Local opt-in | Same as above on Windows/Linux workstation |
| `CHRYSALIS_GCE_SLIM_HUB_STRATEGIC=1` | GCE default | Skips inline hub-strategic batch smokes (covered by hub scripts) |
| `CHRYSALIS_HUB_CWL_BATCH_FAST_CHAIN=1` | GCE default | v31+ chains use graduation-only skipPrior |
| `CHRYSALIS_GCE_FULL_VITEST=1` | Optional GCE | Adds full `pnpm test` workspace pass |

---

## Recommended workflows

### Full verification (release / queue completion)

```powershell
pnpm run test:gce
pnpm run test:gce:status   # wait for STATUS: OK
pnpm run test:gce:fetch
```

### Windows quick loop (gate-only)

```powershell
pnpm exec vitest run packages/cli/tests/hub-cwl-authoring-batch-v64-v70.test.ts
pnpm exec vitest run packages/cli/tests/hub-cwl-authoring-batch-v71-v90.test.ts
pnpm exec vitest run packages/cli/tests/hub-cwl-authoring-batch-v91-v110.test.ts
# v106-v110 skipped unless:
$env:CHRYSALIS_RUN_HUB_HEAVY_AUTHORING_BATCH='1'
pnpm exec vitest run packages/cli/tests/hub-cwl-authoring-batch-v91-v110.test.ts
```

### Cross-platform spot check

```powershell
pnpm run verify:gce
```

---

## What belongs on GCE only

Do **not** expect a sleeping Windows laptop to finish:

- Authoring batches **v106–v110** (mega / graduation lock)
- **`ci:hub-completion`** full artifact generation
- **`hub-cwl.test.ts`** deep composites without `skipPriorChain`
- Optional **`CHRYSALIS_GCE_FULL_VITEST=1`** workspace pass

Track new Windows-specific flakes here when discovered; prefer fixing shared code (retries, skipPrior gates) over Windows-only forks.
