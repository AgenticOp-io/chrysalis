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

### Phase 1 — PHP wedge depth (months 1–9) — **P0**

- **Laravel** ingest depth driven by verify gaps (flagship-full north star)
- **Plain PHP / Symfony** second vertical
- Verify divergence taxonomy → Hub playbooks
- PHP emit **parity**: hono = fastify = nextjs on oracle slice (verify, not smoke-only)
- Chimera cutover runbooks + operator metrics
- Hub pipeline: prep → capture assist → translate → **verify gate** before “done”

**Freeze:** New pattern-lift matrix gold unless tied to a **real customer route** or flagship fixture.

### Phase 2 — Migration OS (months 6–15) — **P1**

- Site intelligence (scan → languages, DBs, route estimate, risk)
- Migration **programs** (templates: API slice, auth slice, public read-only)
- Per-site **evidence dashboard** (verify %, corpus, blockers)
- Path explorer → “apply to this project”
- Commercial alignment with license tiers (D289)

**Deliverable:** Export **migration contract** per project (`routes.cwl` + hole manifest).

### Phase 3 — CWL interchange + authoring bootstrap (months 9–24) — **P1**

- RFC track: body, response, effects, auth presets, multi-file modules (0005+), and authoring ergonomics
- **Project-to-CWL** on every hub translate
- CWL diff in PRs; optional CWL → OpenAPI export
- CWL authoring toolkit minimum: formatter/linting diagnostics, starter templates, preview loop

### Phase 4 — Second oracle origin (months 12–24) — **P2**

Pick **one**: Node/Express (recommended first), or Python, or Java.

- One **flagship** + oracle record + verify-tier before marketing second origin

### Phase 5 — CWL runtime (accelerated) — **P1**

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


### Full-stack CWL — next 10 steps (after G1158)

**Active full-stack queue (2026-06-17):** **Queues 111–115 active** — see **`docs/CWL-FULLSTACK-QUEUES-111-120.md`**. Post–queue 110 Phase A+B **complete** (2026-06-16).

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