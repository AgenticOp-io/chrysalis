# Chrysalis — Strategic plan (locked)

> **Status:** locked (2026-05-26)  
> **Authority:** This document governs *what to build and in what order*. It does not override `**DESIGN.md`** non-negotiables or `**ROADMAP.md**` mechanics.  
> **For AI assistants:** Read `**AGENTS.md`** § “Strategic path (locked)” before planning or implementing.

---

## 0. How to use this document


| User message sounds like                            | Treat as                                                                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| “Build …”, “Implement …”, “Add …”, “Fix …”          | Implementation request (still must fit this plan)                                                           |
| “What if …”, “Should we …”, “Can we …”, “Explain …” | **Clarification** — answer in plan terms; **do not fork** unless user explicitly approves a plan change     |
| “Also do X” without “build”                         | **Question** — is X on-plan or off-plan? Say which phase/workstream it belongs to, or that it is **paused** |
| “Forget the plan, do Y”                             | Requires **explicit** plan amendment: `DESIGN.md` Decision Log + edit this file + user approval             |


**North star metrics (customer outcomes, not repo vanity):**

- Time to first green verify on a customer slice
- Route correctness at cutover (in-scope routes)
- Hole density trend (explicit budget)
- Dual-stack / session / SQL parity in production
- Migration cost per route (declining via Hub automation)

**Not north-star metrics:** new matrix pairs for marketing, CWL RFCs without oracle/replay linkage, hub UI without verify/evidence tie-in.

---

## 1. One-sentence strategy

**Win verified migration with oracle and Hub operations while promoting CWL from interchange contract to a full-stack authoring language + runtime surface: own the semantic layer of the web by making credible delivery depend on WebIR + oracle + CWL contracts and, where mature, CWL-authored applications.**

---

## 2. What we are building (three layers)


| Layer      | What it is                                                 | Pays bills?             |
| ---------- | ---------------------------------------------------------- | ----------------------- |
| **Engine** | Record → WebIR → emit → verify → chimera                   | Yes (PHP wedge)         |
| **Hub**    | Multi-site migration operations + evidence loop            | Yes (programs at scale) |
| **CWL**    | Canonical text form of WebIR; interchange + RFC absorption | Yes (long-term moat)    |


The **PHP-to-TypeScript converter** is the **adoption vector**. The **framework** (WebIR, runtime, holes, chimera) is the **product**. **CWL** is how we **own the semantic center** over time.

---

## 3. Honest capability tiers (how we talk externally)


| Tier                     | Meaning                                                               | Examples                                                    |
| ------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Oracle product**       | Behavioral capture + ingest + emit + verify on real traces            | PHP → hono / fastify / nextjs / typescript (4 matrix pairs) |
| **Structural plumbing**  | Hole-free lift/emit on toy/literal fixtures; trace replay where gated | Hub gold suites (119+ structural); most matrix pairs        |
| **Scaffold / advisory**  | Route shells, file-lift, planning APIs                                | Pattern-lift origins; path knowledge; migration planner     |
| **Paused (do not sell)** | No oracle + no real-app depth                                         | “Any language production-ready”; matrix gold as headline    |


**Rule:** Never imply structural matrix gold equals production migration for that pair.

---

## 4. Three horizons (do not skip)

```text
Horizon 1 (0–18 mo)  — PHP wedge: oracle + verify + chimera + Laravel/plain depth
Horizon 2 (6–15 mo)  — Hub as migration OS: evidence dashboard + programs
Horizon 3 (9–48 mo)  — CWL interchange → authoring; optional runtime last
```

Horizon 2 may overlap Horizon 1; Horizon 3 must not block Horizon 1 delivery.

---

## 5. The usefulness engine (evidence factory)

Closed loop — **all product work should strengthen this loop:**

```text
Capture (oracle) → Gap (verify/insight) → Fix (ingest/repair, verify-gated)
  → Re-emit → Re-verify → Update knowledge (path-knowledge, CWL RFC, playbooks)
```

**Hub** is the control plane for this loop, not only SSH + translate.

---

## 6. CWL: what “dominate the web” means

**Dominance** = any serious migration or contract-first API program can express truth in **CWL/WebIR**, prove it with **oracle** (or contract gold), and emit to targets.

**CWL is:**

- Canonical text form of WebIR for routes/handlers/effects
- Interchange between hub, CLI, OpenAPI/HAR/WPTP
- Accumulator of cross-language patterns (RFC process with gold + synthesis)

**CWL is not:**

- A substitute for verify or oracle
- Validated by matrix pair count
- A shortcut to skip evidence gates

**Stages:**


| Stage             | When                   | Win                                                                           |
| ----------------- | ---------------------- | ----------------------------------------------------------------------------- |
| **A — Spec**      | Now → 12 mo            | Reviewable migration contracts                                                |
| **B — Sink**      | 12–24 mo               | Every lift exports CWL projection; OpenAPI/HAR → CWL                          |
| **C — Authoring** | start now; accelerate  | Greenfield services authored in CWL as soon as ergonomics are viable          |
| **D — Runtime**   | start now; phase-gated | Deployable CWL runtime is a first-class target, with emit+verify parity gates |


**Dominance metric:** % of migrated routes with a signed **CWL contract** (+ hole manifest), not GitHub stars.

---

## 7. Phased delivery (authoritative backlog)

### Phase 0 — Truth in packaging (weeks) — **Closed (2026-06-17)**

- [x] Capability matrix doc — **`docs/CAPABILITY-MATRIX.md`** + **`pnpm run hub:capability-matrix`**
- [x] External copy: **PHP oracle migration**, not “575 languages”
- [x] Split **plumbing OK** vs **oracle product OK** in completion/hub reports (**hub-completion** schema + **`docs/CAPABILITY-MATRIX.md`**)

### Phase 1 — PHP wedge depth (months 1–9) — **Closed (2026-06-17)**

- Reinforcement queue **G5740–G5773** complete — see `docs/PHP-WEDGE-PHASE-1.md`

**Freeze:** New pattern-lift matrix gold unless tied to a **real customer route** or flagship fixture.

### Phase 2 — Migration OS (months 6–15) — **Closed (2026-06-17)**

- Reinforcement queue **G5780–G5823** complete — see `docs/MIGRATION-OS-PHASE-2.md`

**Deliverable:** Export **migration contract** per project (`routes.cwl` + hole manifest).

### Phase 3 — CWL interchange + authoring bootstrap (months 9–24) — **Closed (2026-06-17)**

- Reinforcement queue **G5830–G5873** complete — see `docs/CWL-INTERCHANGE-PHASE-3.md`

### Phase 4 — Second oracle origin (months 12–24) — **Closed (2026-06-17)**

- Reinforcement queue **G5880–G5923** complete — see `docs/SECOND-ORACLE-ORIGIN-PHASE-4.md`

### Phase 5 — CWL runtime (accelerated) — **P1** (active)

In-process CWL preview/runtime via `@chrysalis/runtime-cwl` (WebIR simulation) is the base. Expand toward production-grade runtime capability while preserving emit + verify parity checks.

### Phase 6 — CWL runtime at scale (24–48 mo) — **P2**

Full production runtime parity (real SQL/session) remains phase-gated on evidence, but is an explicit product objective.

### Phase 7 — Full-stack CWL surface (parallel track) — **P1**

- Define and implement CWL coverage for frontend/SSR/UI-associated semantics, not only backend route handlers
- Add full-stack flagships with hole budgets and replay/contract evidence gates
- Keep unsupported full-stack constructs explicit via holes until verified lowering exists

---

## 8. Workstream priority (build vs pause)


| Priority | Build                                                                         | Pause                                             |
| -------- | ----------------------------------------------------------------------------- | ------------------------------------------------- |
| **P0**   | PHP oracle E2E, verify playbooks, Hub evidence UI                             | Random matrix pairs                               |
| **P0**   | Laravel/plain PHP ingest from verify gaps                                     | CWL RFC without replay                            |
| **P1**   | CWL HTTP + full-stack surface (body, response, effects, authoring/runtime UX) | “All languages production-ready” without evidence |
| **P1**   | Project-to-CWL export                                                         | Hub UI without delivery metrics                   |
| **P1**   | CWL runtime acceleration with parity gates                                    | Runtime claims without verify parity              |
| **P2**   | Second oracle origin                                                          | Rust/Kotlin oracle before Node/Python flagship    |
| **P2**   | WordPress vertical                                                            | Many literal-only gold suites                     |


---

## 9. Knowledge base (make actionable)

Path knowledge + web DB catalog + synthesis → **playbooks**:

- Pair advice tied to **verify divergence codes**
- Effort / hole forecasts per origin
- DB catalog → emit hints (ORM/SQL layer)
- CWL RFC backlog ranked by **corpus frequency**, not excitement

---

## 10. Business shape (alignment)

1. **Assessment** — scan + small capture + readiness report
2. **Pilot** — fixed route slice, verify threshold
3. **Program** — Hub batch, correctness SLA, chimera support
4. **Platform license** — CLI + Hub + oracle (not per-language SKUs)

---

## 11. Explicit non-goals (even if requested casually)

Without plan amendment, treat these as **out of scope**:

- Chasing full **575×26 production** migration parity for marketing  
- Claiming production-ready CWL runtime without parity evidence (verify + contract coverage)  
- **WordPress** before Laravel oracle path is boringly reliable  
- Promising **any web app, any language** without a second oracle flagship  
- LLM repair that bypasses verify  
- Rebranding structural-only matrix depth as full-stack oracle parity

---

## 12. Next 90 days (default implementation queue)

When the user says “build” without specifying, prefer this queue:


| Month | Focus                                                                       |
| ----- | --------------------------------------------------------------------------- |
| 1     | CWL authoring bootstrap: templates, diagnostics, preview/dev loop hardening |
| 1–2   | Runtime-cwl parity plan + first production-readiness gates                  |
| 2     | Full-stack CWL scope RFC (backend + frontend/SSR boundaries, holes policy)  |
| 2–3   | Second oracle origin flagship depth (Node/Express first)                    |
| 3     | Keep project-to-CWL + CWL diff mandatory on translate paths                 |
| 3–4   | Full-stack flagship pilot with explicit hole budget and evidence gate       |

**Month 1 reinforcement (2026-06-17):** **G5680–G5683** — `runCwlAuthoringBootstrapHardeningGate`, diagnose schema **v3**, `docs/RUNTIME-CWL-PARITY-PLAN.md`, `pnpm run hub:strategic-plan-month1-hardening-smoke`.

**Month 1–2 reinforcement (2026-06-17):** **G5690–G5693** — `runStrategicPlanMonth12RuntimeParityGate`, `pnpm run hub:strategic-plan-month12-runtime-parity-smoke` (optional `CHRYSALIS_STRATEGIC_PLAN_SKIP_EMIT_HTTP=1` for in-process-only).

**Month 2 reinforcement (2026-06-17):** **G5700–G5703** — `docs/CWL-FULLSTACK-SCOPE-RFC.md`, `runStrategicPlanMonth2FullstackScopeGate`, `pnpm run hub:strategic-plan-month2-fullstack-scope-smoke`.

**Month 2–3 reinforcement (2026-06-17):** **G5710–G5713** — `docs/NODE-EXPRESS-ORACLE-ORIGIN-PLAN.md`, `runStrategicPlanMonth23ExpressOracleGate`, `pnpm run hub:strategic-plan-month23-express-oracle-smoke` (optional `CHRYSALIS_STRATEGIC_PLAN_SKIP_ORACLE_VERIFY=1` for lift depth only).

**Month 3 reinforcement (2026-06-17):** **G5720–G5723** — `docs/PROJECT-TO-CWL-TRANSLATE-PATH.md`, `runStrategicPlanMonth3ProjectToCwlGate`, `pnpm run hub:strategic-plan-month3-project-to-cwl-smoke` (optional `CHRYSALIS_STRATEGIC_PLAN_SKIP_PROJECT_CWL_ROUNDTRIP=1` for fast oracle slice).

**Month 3–4 reinforcement (2026-06-17):** **G5730–G5733** — `docs/CWL-FULLSTACK-FLAGSHIP-PILOT.md`, `runStrategicPlanMonth34FullstackPilotGate`, `pnpm run hub:strategic-plan-month34-fullstack-pilot-smoke` (optional `CHRYSALIS_STRATEGIC_PLAN_SKIP_FLAGSHIP_GOLD=1` for preview/budget without gold verify).

**Next 90 days program:** **closed (2026-06-17)**. **Phase 1–4** reinforcement **closed** (**G5740–G5923**). Default build queue: **Phase 5 CWL runtime** (§7).

**Phase 1 reinforcement (2026-06-17):** **G5740–G5743** — `docs/PHP-WEDGE-PHASE-1.md`, `runStrategicPlanPhase1PhpWedgeGate`, `pnpm run hub:strategic-plan-phase1-php-wedge-smoke` (optional `CHRYSALIS_STRATEGIC_PLAN_SKIP_PHP_WEDGE_FLAGSHIPS=1` for gaps/playbooks only).

**Phase 1 Laravel ingest depth (2026-06-17):** **G5750–G5753** — `docs/LARAVEL-VERIFY-GAPS-INGEST-DEPTH.md`, `runStrategicPlanPhase1LaravelIngestDepthGate`, `pnpm run hub:strategic-plan-phase1-laravel-ingest-depth-smoke` (optional `CHRYSALIS_STRATEGIC_PLAN_SKIP_LARAVEL_LIVE_GAPS=1`).

**Phase 1 PHP emit parity (2026-06-17):** **G5760–G5763** — `docs/PHP-EMIT-PARITY-ORACLE-SLICE.md`, `runStrategicPlanPhase1PhpEmitParityGate`, `pnpm run hub:strategic-plan-phase1-php-emit-parity-smoke` (optional `CHRYSALIS_STRATEGIC_PLAN_SKIP_EMIT_PARITY_FLAGSHIPS=1`).

**Phase 1 Chimera cutover (2026-06-17):** **G5770–G5773** — `docs/CHIMERA-CUTOVER-PHASE-1.md`, `runStrategicPlanPhase1ChimeraCutoverGate`, `pnpm run hub:strategic-plan-phase1-chimera-cutover-smoke` (optional `CHRYSALIS_STRATEGIC_PLAN_SKIP_CHIMERA_ORIGIN_BATCH=1`).

**Phase 2 Migration OS entry (2026-06-17):** **G5780–G5783** — `docs/MIGRATION-OS-PHASE-2.md`, `runStrategicPlanPhase2MigrationOsEntryGate`, `pnpm run hub:strategic-plan-phase2-migration-os-entry-smoke` (optional `CHRYSALIS_STRATEGIC_PLAN_SKIP_MIGRATION_OS_STANDALONE_BATCH=1`).

**Phase 2 license tier alignment (2026-06-17):** **G5790–G5793** — `docs/MIGRATION-OS-LICENSE-TIER-ALIGNMENT.md`, `runStrategicPlanPhase2LicenseTierGate`, `pnpm run hub:strategic-plan-phase2-license-tier-smoke`.

**Phase 2 multi-origin batch (2026-06-17):** **G5800–G5803** — `docs/MIGRATION-OS-MULTI-ORIGIN-BATCH.md`, `runStrategicPlanPhase2MigrationOsMultiOriginGate`, `pnpm run hub:strategic-plan-phase2-migration-os-multi-origin-smoke` (optional `CHRYSALIS_STRATEGIC_PLAN_SKIP_MIGRATION_OS_MEGA_BATCH=1`).

**Phase 2 delivery dashboard (2026-06-17):** **G5810–G5813** — hub-completion schema **511** + `phase2MigrationOs`, `runStrategicPlanPhase2DeliveryDashboardGate`, `pnpm run hub:strategic-plan-phase2-delivery-dashboard-smoke`.

**Phase 2 program close (2026-06-17):** **G5820–G5823** — `runStrategicPlanPhase2MigrationOsCloseGate`, `pnpm run hub:strategic-plan-phase2-migration-os-close-smoke`. Phase 2 reinforcement **closed**.

**Phase 3 CWL interchange entry (2026-06-17):** **G5830–G5833** — `docs/CWL-INTERCHANGE-PHASE-3.md`, `runStrategicPlanPhase3CwlInterchangeEntryGate`, `pnpm run hub:strategic-plan-phase3-cwl-interchange-entry-smoke`.

**Phase 3 CWL RFC reinforcement (2026-06-17):** **G5840–G5843** — `docs/CWL-RFC-PHASE-3-REINFORCEMENT.md`, `runStrategicPlanPhase3CwlRfcGate`, optional `CHRYSALIS_STRATEGIC_PLAN_SKIP_CWL_RFC_ROUNDTRIP=1`.

**Phase 3 OpenAPI export (2026-06-17):** **G5850–G5853** — `docs/CWL-OPENAPI-EXPORT-PHASE-3.md`, `runStrategicPlanPhase3CwlOpenapiExportGate`.

**Phase 3 full-stack alignment (2026-06-17):** **G5860–G5863** — `docs/CWL-FULLSTACK-PHASE-3-ALIGNMENT.md`, `runStrategicPlanPhase3FullstackAlignmentGate`.

**Phase 3 program close (2026-06-17):** **G5870–G5873** — `runStrategicPlanPhase3CwlInterchangeCloseGate`, `pnpm run hub:strategic-plan-phase3-cwl-interchange-close-smoke`. Phase 3 **closed**.

**Phase 4 second oracle origin entry (2026-06-17):** **G5880–G5883** — `docs/SECOND-ORACLE-ORIGIN-PHASE-4.md`, `runStrategicPlanPhase4SecondOracleOriginEntryGate`, `pnpm run hub:strategic-plan-phase4-second-oracle-origin-entry-smoke` (optional `CHRYSALIS_STRATEGIC_PLAN_SKIP_ORACLE_VERIFY=1` for lift depth only).

**Phase 4 live oracle verify (2026-06-17):** **G5890–G5893** — `docs/SECOND-ORACLE-LIVE-VERIFY-PHASE-4.md`, `runStrategicPlanPhase4LiveOracleVerifyGate`.

**Phase 4 Express depth batch (2026-06-17):** **G5900–G5903** — `docs/EXPRESS-DEPTH-BATCH-PHASE-4.md`, `runStrategicPlanPhase4ExpressDepthBatchGate`.

**Phase 4 Express delivery batch (2026-06-17):** **G5910–G5913** — `docs/EXPRESS-DELIVERY-BATCH-PHASE-4.md`, `runStrategicPlanPhase4ExpressDeliveryBatchGate`.

**Phase 4 program close (2026-06-17):** **G5920–G5923** — `runStrategicPlanPhase4SecondOracleOriginCloseGate`, `pnpm run hub:strategic-plan-phase4-second-oracle-origin-close-smoke`. Phase 4 **closed**.


### Full-stack CWL — next 10 steps (after G1158)

**Full-stack queue (2026-06-17):** **Queues 111–437 complete** (schema **510**) — post-110 authoring replay program **closed**; maintenance only.

**Fast batch proof:** set `**CHRYSALIS_HUB_CWL_BATCH_FAST_CHAIN=1`** so v31+ chains use v30 graduation-only (skips re-running batches v2–v29).

**Default test execution (2026-06-01):** run the full suite on Linux GCE, not on a sleeping laptop — `**pnpm run test:gce`** (see `**docs/GCE-LOCAL-VERIFY.md**`).

### Hub verify-gaps program (post–Next 90 days) — **Closed (2026-06-16)**

**Status:** months **26–30** shipped (**hub-completion schema 74** baseline); **Phase B** reinforcement complete on GCE (**G2272**, **`pnpm run hub:verify-gaps-post110-reinforcement-smoke`**). Maintenance only — no new schema fork unless hub-completion bumps.


| Month | Focus | Status |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| 26 | Auth-probe verify seed closure after strict reingest (schema 70) | **Closed** |
| 27 | **Real verify replay** after reingest (`CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY`); multi-flagship replay; IR helper lifting hub smoke (schema 71) | **Closed** |
| 28 | **HTTP oracle verify** after reingest (`CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP`); multi-flagship HTTP verify; IR helper semantic lifting (schema 72) | **Closed** |
| 29 | **Fastify HTTP oracle verify** + IR helper embed lifting B4 (`--ingest-embed-shared-helper-bodies`); multi-flagship Fastify HTTP batch (schema 73) | **Closed** |
| 30 | **Hub verify-gaps graduation** — reingest + Fastify HTTP (`CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP_TARGET`); IR helper B1–B4 full path; dual-backend HTTP verify loop complete (schema 74) | **Closed** |


HTTP verify runs emit + live server + `chrysalis verify --base-url` — stronger than in-process replay. Replay and seed closure remain for faster probes. Fastify HTTP verify proves the second emit backend on live HTTP.

---

## 13. Amending this plan

1. User explicitly requests a strategy change.
2. Add `**DESIGN.md` Decision Log** entry (why).
3. Edit this file and `**ROADMAP.md`** strategic section.
4. Do not silently implement off-plan work.

---

*Related: `DESIGN.md`, `ROADMAP.md` (Strategic program), `docs/HUB-CROSS-LANGUAGE-SYNTHESIS.md`, `docs/CWL.md`.*