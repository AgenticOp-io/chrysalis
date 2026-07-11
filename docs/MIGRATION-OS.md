# Migration OS — the prize

> **Status:** **closed composite** (**G8550**, **D6288**) — active operator surface  
> **Authority:** `DESIGN.md` §3; `STRATEGIC-PLAN.md` §12; `ROADMAP.md` Phases 33–39  
> **Start here** if you are new to what Chrysalis ships today.

Chrysalis is not “a PHP converter.” The product is **verified migration infrastructure**: legacy sites become **CWL** over **WebIR**, every step is **oracle-checked**, evidence feeds a **federated corpus**, and **agent tools** export **Intelligence Shorthand** instead of burning GPU on weights.

**Models propose; WebIR + oracle + verify dispose.**

---

## What you get

| Layer | What it is | Operator artifact |
| --- | --- | --- |
| **Site → CWL → LLM** | Port a site, verify replay, export training shards + WVB cases | `chrysalis port-site`, port reports |
| **Verified Migration Federation (VMF)** | Crowd merge of verify-green shards; Verify League; Open Legacy Index | `reports/federation/` |
| **Migration Evidence hub** | One dashboard linking port, federation, and web-LLM POCs | `reports/migration-evidence/poc/` |
| **Intelligence Shorthand (IS)** | CPU-only IS-T3/T4/T5 export (~10³–10⁶× vs 7B weights) | `reports/web-llm/shorthand/` |
| **Open web-LLM** | Trajectories, WVB, MCP tools, agent POC scenarios | `@chrysalis/web-llm`, `web-llm:mcp-server` |

WISP Module_Manager remains the **CWL showcase lab** (subordinate to this stack). The **language** is CWL; WISP proves surfaces close with gates — it is not the product name.

**Active build program:** whole-site CWL conversion is **closed** at **G9450** ([`WHOLE-SITE-CWL-CONVERSION.md`](./WHOLE-SITE-CWL-CONVERSION.md)). Regression: `pnpm run hub:whole-site-cwl-close-smoke`.

---

## Pipeline (one picture)

```text
Open Legacy Index (7 fixtures)
        │
        ▼
  port-site ──► site intelligence → WebIR → CWL → verify replay
        │              │
        │              ├── trajectory JSONL + training shards
        │              └── port report (.chrysalis/site-port.json)
        ▼
  federation submit-shard ──► corpus merge ──► Verify League ──► WVB
        │
        ├── VMF hub API (local HTTP ingest)
        ├── bundle export
        └── Intelligence Shorthand export (CPU)
        ▼
  Migration Evidence hub + agent MCP tools
```

---

## One-command demos

```bash
# Full Migration OS loop (evidence + VMF + web-LLM agent)
pnpm run migration-evidence:demo
# → reports/migration-evidence/poc/index.html

# VMF only (ports all index fixtures, league, bundle, IS hub)
pnpm run federation:demo

# Web-LLM agent POC (5 scenarios incl. IS export)
pnpm run web-llm:demo

# Intelligence Shorthand only (CPU, no GPU)
pnpm run web-llm:export-shorthand
pnpm run web-llm:build-shorthand-hub

# Local VMF HTTP hub (remote contributors POST shards + reports only)
pnpm run federation:serve
```

CLI equivalents: `chrysalis evidence demo`, `chrysalis federation demo`, `chrysalis port-site`, `chrysalis federation export-shorthand`.

---

## Close gates (regression)

| Gate | Smoke | What it proves |
| --- | --- | --- |
| **G8550** | `hub:migration-os-close-smoke` | Evidence + open legacy + VMF + IS + showcase/GPU + product sample + shells + hydrate + public reports + live hit-rate READY (schema **v19**) |
| **G8560** | `hub:intelligence-shorthand-close-smoke` | IS-T3/T4/T5 export + hub (CPU) |
| **G8540** | `hub:site-port-federation-hub-close-smoke` | VMF hub program |
| **G8520** | `hub:site-port-open-legacy-close-smoke` | 7-fixture index + nightly + wedge |
| **G8570** | `hub:site-port-open-legacy-wedge-smoke` | WordPress vertical wedge |
| **G8310** | `hub:wisp-web-llm-poc-close-smoke` | WISP UI + web-LLM + IS (+ optional live) |
| **G8290** | `hub:open-web-llm-close-smoke` | Framework close (trajectories, WVB, MCP) |
| **G8790** | `hub:full-matrix-oracle-close-smoke` | 72/72 core matrix oracle-product |
| **G8830** | `hub:llm-assisted-convert-close-smoke` | Verify-gated convert assist + MCP + IS routing |
| **G8940** | `hub:llm-convert-full-close-smoke` | LLM enrich + verify-gated apply + repair bridge |
| **G9140** | `hub:phase44-program-close-smoke` | Extended matrix waves + hole closure + Horizon C (169/601 honest) |
| **G9160** | `hub:extended-matrix-oracle-progress-smoke` | 601-pair oracle-product census (**601/601**; waves **8–16** maintenance) |
| **G8600** | `hub:is-runtime-close-smoke` | IS tier retrieval + skip-LLM routing (CPU) |
| **G9510** | `hub:is-live-analytics-close-smoke` | Hit / near-miss / miss + verifyCostMs |
| **G9520** | `hub:is-near-miss-salience-smoke` | CynoEngine-inspired near-miss salience |
| **G9530** | `hub:is-utility-prior-smoke` | Outcome → utility prior |
| **G9540** | `hub:convert-governor-smoke` | Convert GREEN/YELLOW/RED governor |
| **G9550** | `hub:convert-aim-persist-smoke` | Aim persistence / stall contentless nudge |
| **G9600** | `hub:is-live-operator-evidence-smoke` | Operator hub-convert trajectory aggregate |
| **G9610** | `hub:wisp-showcase-bound-smoke` | Honest **~564** WISP residual hole budget (post G9750) |
| **G9710** | `hub:wisp-nav-wizard-shell-smoke` | Nav/menu + wizard chrome shells |
| **G9730** | `hub:wisp-fill-holes-smoke` | Widget shells + showcase hydrate samples |
| **G9740** | `hub:wisp-fill-holes-smoke` | Full apiPath samples + if/length/bool settle |
| **G9750** | `hub:wisp-fill-holes-smoke` | Enriched traces + Object.entries/ternary/$store |
| **G9620** | `hub:gpu-lab-close-smoke` | IS-T2 LoRA prep + GCE GPU orchestrator contract |
| **G9630** | `hub:is-near-miss-salience-v2-smoke` | Salience v2 z-score; auto ≥20 operator domains |
| **G9640** | `hub:operator-evidence-seed-smoke` | Seed ≥20 domains / hub-convert-shaped trajectories |
| **G9650** | `hub:live-analytics-hub-smoke` | IS Live Analytics HTML dashboard |
| **G9660** | `hub:wisp-modal-shell-smoke` | Inert modal shells (`data-cwl-modal-shell`) |
| **G9670** | `hub:product-hit-rate-sample-smoke` | Product sample READY at ≥50 jobs |
| **G9760** | `hub:product-hit-rate-live-smoke` | Live hit-rate READY only from hub-convert-verify (≥50); seed cannot claim |
| **G9770** | `hub:product-hit-rate-live-ready-smoke` | Batch ≥50 hub-convert-verify jobs → `productHitRateLiveReady` |
| **G9680** | `hub:wisp-map-shell-smoke` | Map/chart embed shells + expanded modals |
| **G9700** | `hub:public-reports-smoke` | Public hub `/reports/` static serve |
| **G6731** | `hub:cwl-language-maintenance-smoke` | CWL IR helper lifting B7–B103 regression (weekly CI) |

Nightly CI: `.github/workflows/open-legacy-index-nightly.yml` (includes **G8570** wedge)  
Weekly CI: `.github/workflows/maintenance-weekly.yml` (**G6731**)  
GCE full suite: `pnpm run test:gce` — see [`GCE-LOCAL-VERIFY.md`](./GCE-LOCAL-VERIFY.md).

---

## Deep-dive program docs

| Topic | Doc |
| --- | --- |
| Site → CWL → LLM (Phase 33) | [`SITE-TO-CWL-LLM-PROGRAM.md`](./SITE-TO-CWL-LLM-PROGRAM.md) |
| Verified Migration Federation (Phase 34–38) | [`SITE-PORT-FEDERATION-PROGRAM.md`](./SITE-PORT-FEDERATION-PROGRAM.md) |
| Migration Evidence POC (Phase 35) | [`MIGRATION-EVIDENCE-POC-PROGRAM.md`](./MIGRATION-EVIDENCE-POC-PROGRAM.md) |
| Open web-LLM framework (Phase 32) | [`OPEN-WEB-LLM-PROGRAM.md`](./OPEN-WEB-LLM-PROGRAM.md) |
| Agent POC scenarios | [`OPEN-WEB-LLM-POC.md`](./OPEN-WEB-LLM-POC.md) |
| Intelligence Shorthand | [`INTELLIGENCE-SHORTHAND.md`](./INTELLIGENCE-SHORTHAND.md) |
| LLM-assisted convert (Phase 42) | [`LLM-ASSISTED-CONVERT-PROGRAM.md`](./LLM-ASSISTED-CONVERT-PROGRAM.md) |
| Full matrix oracle (Phase 41) | [`FULL-MATRIX-ORACLE-PROGRAM.md`](./FULL-MATRIX-ORACLE-PROGRAM.md) |
| Training shard recipe | [`WEB-LLM-TRAINING-RECIPE.md`](./WEB-LLM-TRAINING-RECIPE.md) |
| WVB | [`WEB-VERIFY-BENCHMARK.md`](./WEB-VERIFY-BENCHMARK.md) |

Open Legacy Index: [`fixtures/site-port-federation/open-legacy-index.v1.json`](../fixtures/site-port-federation/open-legacy-index.v1.json) — tiny-blog, plain-php, symfony, express, laravel-min, cwl-fullstack, wordpress-probe.

---

## Engine and CLI (substrate)

Migration OS sits on the translate / capture / replay engine. When you need flags, env vars, dual-stack, or CI gates:

| Need | Doc |
| --- | --- |
| Install + build | [`INSTALLATION.md`](./INSTALLATION.md) |
| Command reference | [`USER-GUIDE.md`](./USER-GUIDE.md) |
| Copy-paste scenarios | [`HOW-TO.md`](./HOW-TO.md) |
| Goal → command map | [`USE-CASES.md`](./USE-CASES.md) |
| Operations / verify / chimera | [`OPERATIONS.md`](./OPERATIONS.md) |
| Production deployment | [`DEPLOYMENT.md`](./DEPLOYMENT.md) |
| Hub SSH / multi-site | [`HUB-CONNECTIVITY.md`](./HUB-CONNECTIVITY.md) |
| Architecture narrative | [`WHITEPAPER.md`](./WHITEPAPER.md) |

Non-negotiables and vocabulary: [`DESIGN.md`](../DESIGN.md). Build order: [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md). Active status: [`ROADMAP.md`](../ROADMAP.md).

---

## History and archived programs

Phases **1–31** (PHP wedge, CWL language waves, WISP full-site, etc.) are **closed**. They remain valuable as **source material** for gates, fixtures, and design decisions — not as the default build queue.

**Archive index:** [`archive/INDEX.md`](./archive/INDEX.md)  
**Shipped strategic log:** [`archive/STRATEGIC-PLAN-SHIPPED-LOG.md`](./archive/STRATEGIC-PLAN-SHIPPED-LOG.md)  
**Maintenance queue:** [`PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md)

> **Naming note:** [`MIGRATION-OS-PHASE-2.md`](./MIGRATION-OS-PHASE-2.md) is an **older** strategic-plan phase (Hub entry, G5780). The **Migration OS** described here is the **2026 operator composite** (**G8550**) — evidence + federation + IS. Do not conflate the two.
