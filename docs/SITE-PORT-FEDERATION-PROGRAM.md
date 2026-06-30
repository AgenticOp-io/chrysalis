# Verified Migration Federation (VMF) — world expansion program

> **Status:** POC closed **G8470** (Open Legacy Index + one-command demo)  
> **Authority:** **DESIGN D6281** / **D6282** / **D6283**  
> **Builds on:** Phase 33 `chrysalis port-site` (**G8400**), verify matrix (**G8410**), `@chrysalis/web-llm` (**G8290**)

## Thesis

Expand Chrysalis to the world **without uploading proprietary legacy source**. Contributors run **`chrysalis port-site` locally**; the network aggregates **verify-gated evidence** — trajectories, WVB cases, verify shard summaries — not raw code.

**Models propose; WebIR + oracle + verify dispose.** This is the moat that makes a SETI-like crowd model safe.

Charter: [`fixtures/site-port-federation/chrysalis.site-port-federation.v1.json`](../fixtures/site-port-federation/chrysalis.site-port-federation.v1.json)

## Why not classic SETI@home?

| SETI pattern | VMF adaptation |
| --- | --- |
| Download work unit, return signal | Download **open fixture bundle**, return **signed verify summary + trajectory shard** |
| Central re-check | **Oracle replay** + WVB re-score (already in repo) |
| Anyone uploads data | **Forbidden:** raw customer source; **allowed:** public OSS repos + exported shards |
| Mass appeal | Niche but **high value per contributor** (maintainers, migration shops, framework authors) |

## Two tiers (locked)

### Public tier — federation-ready today

Contributors **do not** send source. They send:

| Artifact | Kind | How produced |
| --- | --- | --- |
| Port report | `chrysalis.site-port.v1` | `chrysalis port-site <open-fixture>` |
| Trajectory shard | `chrysalis.web-llm.training-shard` | auto on port + `web-llm:export-dataset` |
| Verify summary | `chrysalis.hub.verify-replay` | probe replay in port-site (correctness ≥ 1) |
| WVB case | `chrysalis.web-llm.web-verify-benchmark` | `web-llm:build-benchmark` + new cases from open fixtures |

**Work units (v1):**

1. **Open fixture port** — run port-site on a listed OSS PHP/JS app; publish port report + trajectory path hash.
2. **Verify shard replay** — re-run verify on a published fixture bundle; return summary JSON (shard merge already exists in CLI).
3. **WVB case submission** — propose a new benchmark case tied to a verify-green route; central gate merges if replay passes.
4. **Trajectory shard export** — donate verify-gated JSONL shards only (no source).

Entry smoke: `pnpm run hub:site-port-federation-entry-smoke` (**G8420**)

### Private tier — enterprise (no crowd upload)

Customers run the **same pipeline on-prem**:

```bash
chrysalis observe …        # capture traces locally
chrysalis port-site ./app  # CWL + trajectories + verify
```

Optional **contractual shard export** (redacted trajectories, no source) feeds the public WVB without exposing IP. Hub operations lane owns multi-site scale.

## Architecture (maps to existing code)

```text
┌─────────────────────────────────────────────────────────────┐
│  Contributor machine (source never leaves)                  │
│  chrysalis port-site → .chrysalis/site-port.json            │
│                     → reports/web-llm/site-port/*.jsonl       │
│                     → reports/web-llm/dataset/site-port/    │
└──────────────────────────┬──────────────────────────────────┘
                           │ publish shards + verify summaries only
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Federation aggregator (Phase 34b–d — file-based v1; Phase 38 HTTP hub) │
│  reports/federation/ · federation:serve :19101 · POST /api/vmf/submit   │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Horizon C — sponsor GPU fine-tune on merged corpus         │
│  evaluate on WVB + verify replay (out of repo until funded)   │
└─────────────────────────────────────────────────────────────┘
```

**Already shipped (reuse, do not fork):**

| Component | Path |
| --- | --- |
| Port pipeline | `scripts/site-port-to-cwl.mjs`, `chrysalis port-site` |
| Verify replay | `scripts/hub-ingest/hub-verify-replay.mjs` |
| Trajectory + policy | `@chrysalis/web-llm` (`logSitePortStep`, `evaluateSitePortVerifyGate`) |
| Shard export | `scripts/web-llm-export-dataset.mjs` |
| WVB | `scripts/web-llm-build-benchmark.mjs` |
| MCP agent tools | `scripts/web-llm-mcp-server.mjs` |
| Verify shard merge | `chrysalis verify-merge`, `mergeWebIrModules` |

## Phased rollout

| Phase | Goal | Gate | Built? |
| --- | --- | --- | --- |
| **33** | Site → CWL → LLM pipeline | **G8400** | Yes |
| **33b** | Verify in port loop | **G8410** matrix | Yes |
| **34a** | Federation charter + entry | **G8420** | Yes (entry) |
| **34b** | Public work-unit registry + shard ingest | **G8430** | Yes (file registry) |
| **34c** | Contributor CLI `chrysalis federation submit-shard` | **G8440** | Yes |
| **34d** | WVB crowd merge + leaderboard publish | **G8450** | Yes |
| **34 close** | Full VMF loop | **G8460** | Yes |
| **34 POC** | Open Legacy Index + WVB merge + operator hub | **G8470** | Yes |
| **36** | Multi-origin index (PHP + JavaScript) | **G8490** | Yes |
| **37a** | Laravel-min wedge (5 fixtures) | **G8500** | Yes |
| **37b** | Nightly verify matrix CI | **G8510** | Yes |
| **38a** | Local VMF hub HTTP API | **G8530** | Yes |
| **38b** | Remote payload submit + publish-all + bundle | **G8540** | Yes |
| **Migration OS** | Evidence + open legacy + VMF hub composite | **G8550** | Yes |
| **Horizon C** | Fine-tune on merged corpus | sponsor | **No** |

## Best expansion idea (recommended)

**“Open Legacy Index + Verify League”**

1. **Curate** 50–200 **open-source** legacy web apps (PHP first, then Express/Vue pilots) with permissive licenses.
2. **Publish** fixture bundles in-repo or submodule (like WISP, not customer code).
3. **Run** `hub:site-port-verify-matrix-smoke` scale-out in CI on each bundle (nightly).
4. **Rank** contributors on **WVB score + verify correctness + holes closed** — public leaderboard from CI artifacts (`web-llm:build-leaderboard`).
5. **Merge** trajectory shards into a **public training corpus** when verify-green (no source in corpus).
6. **Fund** Horizon C fine-tune when corpus justifies GPU — model must beat engine baseline on WVB.

This is **Fold@home for verify** plus **Kaggle for migration evidence**, not SETI for source code.

## Governance (non-negotiables)

From `DESIGN.md` §3 — federation must **never**:

1. Accept unverified LLM output into the training corpus.
2. Bypass oracle/verify for “helpful” crowd submissions.
3. Treat structural matrix gold as production migration proof.
4. Upload production secrets, `.env`, or customer DB dumps.

Every submission carries **provenance**: fixture id, gate names, correctness, schema version.

## Commands (today)

```bash
# One-command POC (ports all Open Legacy Index fixtures, submit, corpus, league, WVB, hub)
pnpm run federation:demo
# → reports/federation/poc/index.html

# Contributor workflow (local, source stays local)
chrysalis port-site fixtures/tiny-blog --origin php
chrysalis federation submit-shard fixtures/tiny-blog --contributor my-handle
chrysalis federation merge-corpus
chrysalis federation merge-wvb
chrysalis federation publish-league
pnpm run federation:export-bundle
# → reports/federation/league/index.html
# → reports/federation/bundle/open-legacy-bundle.v1.json

# Intelligence Shorthand (CPU only — no GPU)
pnpm run web-llm:export-shorthand
pnpm run web-llm:build-shorthand-hub
chrysalis federation export-shorthand
# → reports/web-llm/shorthand/poc/index.html

# Local VMF hub (remote contributors POST shards + port reports only)
pnpm run federation:serve
# POST /api/vmf/submit-shard  { fixtureId, contributor, portReport, shard }
# POST /api/vmf/publish-all
# POST /api/vmf/export-shorthand   → IS-T3/T4/T5 export (CPU only)
# GET  /api/vmf/shorthand          → latest intelligence-shorthands.v1.json

# Or via pnpm scripts
pnpm run federation:sync-registry
pnpm run federation:submit-shard -- fixtures/tiny-blog
pnpm run federation:merge-corpus
pnpm run federation:merge-wvb
pnpm run federation:publish-league

pnpm run federation:publish-league
pnpm run federation:export-bundle

# Gates
pnpm run hub:migration-os-close-smoke              # G8550 (Migration OS)
pnpm run hub:site-port-federation-hub-close-smoke   # G8540
pnpm run hub:site-port-federation-poc-close-smoke  # G8470 (full POC)
pnpm run hub:site-port-federation-close-smoke   # G8460 (full loop)
pnpm run hub:site-port-close-smoke              # G8400
pnpm run hub:site-port-verify-matrix-smoke      # G8410 (Open Legacy Index)
pnpm run hub:site-port-federation-hub-api-smoke  # G8530
pnpm run hub:site-port-open-legacy-close-smoke   # G8520
pnpm run hub:site-port-federation-entry-smoke   # G8420
pnpm run hub:site-port-federation-registry-smoke  # G8430
pnpm run hub:site-port-federation-submit-smoke    # G8440
pnpm run hub:site-port-federation-league-smoke    # G8450
```

**Open Legacy Index:** [`fixtures/site-port-federation/open-legacy-index.v1.json`](../fixtures/site-port-federation/open-legacy-index.v1.json) — tiny-blog, plain-php, symfony, express, laravel-min, cwl-fullstack.

**Nightly verify:** `.github/workflows/open-legacy-index-nightly.yml` (**G8510**)

## Related docs

- [`SITE-TO-CWL-LLM-PROGRAM.md`](./SITE-TO-CWL-LLM-PROGRAM.md) — Phase 33 product pipeline
- [`OPEN-WEB-LLM-PROGRAM.md`](./OPEN-WEB-LLM-PROGRAM.md) — trajectories, WVB, MCP
- [`WEB-LLM-TRAINING-RECIPE.md`](./WEB-LLM-TRAINING-RECIPE.md) — shard export recipe
- [`COMMERCIAL.md`](./COMMERCIAL.md) — private tier / enterprise path
