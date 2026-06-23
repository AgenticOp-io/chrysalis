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
| New phase / wave build                              | **Refuse** until prior phase **close gate** passes and docs say **closed** (**close before build**)         |


**North star metrics (customer outcomes, not repo vanity):**

- Time to first green verify on a customer slice
- Route correctness at cutover (in-scope routes)
- Hole density trend (explicit budget)
- Dual-stack / session / SQL parity in production
- Migration cost per route (declining via Hub automation)

**Not north-star metrics:** new matrix pairs for marketing, CWL RFCs without oracle/replay linkage, hub UI without verify/evidence tie-in.

**North star vs POC (do not conflate):**

| North star | POC |
| --- | --- |
| **CWL** — the final consolidated **web language** (API, Pages, Data, UI, Effects) over **WebIR**, verified by oracle | **WISP Module_Manager** — a **showcase lab** that demonstrates CWL surfaces on a real operator app |
| **CWL is authoritative** — RFCs, WebIR, oracle, and verify define the language | **The POC exists solely to showcase the language** — wins must **generalize**; WISP-specific paths stay catalogued, not baked in |
| Success = language + engine + verify truth | Success on WISP = evidence that a surface wave **closes with gates** — transferable, not “ship WISP” |

WISP is **important** as a showcase. It is **not** the product name, the north star, or the definition of CWL. **GenieACS is WISPTools legacy — not Chrysalis POC scope** (**D6205**).

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
| **Paused (do not sell)** | No oracle + no real-app depth                                         | Vanity matrix pairs without customer route                  |
| **Phase 10 (closed)**    | Production parity reinforcement shipped; maintenance default queue         | See `docs/PRODUCTION-PARITY-PHASE-10.md` (archive)      |


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

### Phase 5 — CWL runtime (accelerated) — **Closed (2026-06-17)**

- Reinforcement queue **G5930–G5963** complete — see `docs/CWL-RUNTIME-PHASE-5.md`

### Phase 6 — CWL runtime at scale (24–48 mo) — **Closed (2026-06-17)**

- Reinforcement queue **G5970–G6003** complete — see `docs/CWL-RUNTIME-SCALE-PHASE-6.md`

### Phase 7 — Full-stack CWL surface (parallel track) — **Closed (2026-06-17)**

- Reinforcement queue **G6010–G6043** complete — see `docs/CWL-FULLSTACK-PHASE-7.md`

### Phase 8 — Product proof (strict reinforcement) — **Closed (2026-06-18)**

- Reinforcement queue **G6050–G6113** complete — see `docs/PRODUCT-PROOF-PHASE-8.md`
- **Strict path:** `pnpm run test:gce:phase8-strict` (GCE); passed **2026-06-18**
- **Local fast path:** same smokes with explicit skip opts (Vitest default)

### Phase 9 — Operational hardening — **Closed (2026-06-18)**

- Reinforcement queue **G6120–G6153** complete — see `docs/OPERATIONAL-HARDENING-PHASE-9.md`
- Hub-completion schema **512** + `phase8ProductProof` section
- Capability matrix schema **34** + `strategicPlanPhase8ProductProof`

**Strategic plan phases 0–10:** all reinforcement queues **closed** (**G5680–G6257**).

### Phase 10 — Production parity — **Closed (2026-06-19)**

- Reinforcement queue **G6200–G6253** complete — see `docs/PRODUCTION-PARITY-PHASE-10.md`
- Program archive close **G6254–G6257** — maintenance default queue restored
- **Runtime Phase C** remains **active** (session/SQL verify gates; not reverted to stub-only claims)
- Hub-completion schema **513** + `phase10ProductionParity` (depth schema **8**)

**Strategic plan phases 0–10:** all reinforcement queues **closed** (**G5680–G6257**).

**Default build queue:** **IR helper maintenance** (subordinate, **G6731**) after **CWL complete language closed** (**G7150**, Phases **15–18**, **D6208**). Regression: `hub:cwl-complete-language-close-smoke`. **Phase 14 closed** (**G6690**). **Language v1 closed** (**G6750**). **Phase 13 CWL surfaces closed** (**G6410**). **Phase 12 Phase 0 closed** (**G6310**).

### Phase 15 — CWL UI v0 (**closed G7110**)

- **Authority:** **DESIGN D6207–D6208** — RFC-0017 + RFC-0018 (`@component`); [`CWL-UI-LOGIN-BRIDGE.md`](./CWL-UI-LOGIN-BRIDGE.md) for WISP `/login`
- **Close G7110:** `pnpm run hub:cwl-phase15-close-smoke`
- **Smoke G7111:** `pnpm run hub:cwl-ui-v0-smoke`

### Phase 16 — CWL Data complete (**closed G7120**)

- **Authority:** RFC-0013 — native `load { }` on flagship + WISP charter
- **Close G7120:** `pnpm run hub:cwl-data-complete-smoke`

### Phase 17 — CWL Effects executable (**closed G7130**)

- **Authority:** RFC-0007 — `wrapCwlExecutableEffects` lowers `session.read` / `session.write` to effect-dialect nodes
- **Close G7130:** `pnpm run hub:cwl-effects-executable-smoke`

### Phase 18 — Cutover and greenfield (**closed G7140**)

- **Authority:** [`CWL-SURFACE-TAXONOMY.md`](./CWL-SURFACE-TAXONOMY.md) ladder **step 5** — single firebase login hole on WISP
- **Close G7140:** `pnpm run hub:cwl-cutover-smoke`

### CWL complete language close (**closed G7150**)

- **Win:** Phases **15–18** + **G6731** maintenance composite green
- **Smoke:** `pnpm run hub:cwl-complete-language-close-smoke`
- **Regression:** Phase 13–14 smokes remain green

---

### Phase 12 — WISP CWL flagship (Phase 0 closed)

- **Queue G6300–G6310 closed** — see [`docs/WISP-CWL-FULLSTACK-PROGRAM.md`](./WISP-CWL-FULLSTACK-PROGRAM.md)
- **Close verify:** `pnpm run hub:wisp-cwl-phase12-phase0-close-smoke` (**G6310**)
- **Topology:** [`docs/WISP-CWL-FULLSTACK-PROGRAM.md`](./WISP-CWL-FULLSTACK-PROGRAM.md) (Topology and deploy)

### Phase 13 — CWL surface waves (**closed G6410**)

- **Authority:** **DESIGN D6193** — [`docs/CWL-SURFACE-TAXONOMY.md`](./CWL-SURFACE-TAXONOMY.md)
- **Gate G6340:** `pnpm run hub:cwl-surface-taxonomy-smoke`
- **Close G6410:** `pnpm run hub:wisp-cwl-phase13-close-smoke`
- **Program:** WISP module waves M0–M6 closed **CWL API → Pages → Data → UI → Effects** per [`WISP-CWL-FULLSTACK-PROGRAM.md`](./WISP-CWL-FULLSTACK-PROGRAM.md)
- **Refuse:** sidecar bridges without holes; “full replacement” claims while `hub-svelte:page-component` remains

### Phase 14 — WISP HSS operator deploy (**closed G6690**)

- **Authority:** **DESIGN D6204**, **D6205** — [`WISP-CWL-FULLSTACK-PROGRAM.md`](./WISP-CWL-FULLSTACK-PROGRAM.md) § Phase 14
- **Close G6690:** `pnpm run hub:wisp-cwl-phase14-program-close-smoke`
- **Operator regression G6590:** `pnpm run hub:wisp-cwl-phase14-close-smoke`
- **Refuse:** **GenieACS is WISPTools legacy — not Chrysalis POC scope** (**D6205**); no CWL RFCs, runtime special cases, or verify gates for GenieACS/ACS
- **Verify:** `pnpm run hub:wisp-cwl-phase14-program-close-smoke`, `pnpm run wisp:operator-verify -- --require`, Phase 13 regression **G6410**

---

## 8. Workstream priority (build vs pause)


| Priority | Build                                                                         | Pause                                             |
| -------- | ----------------------------------------------------------------------------- | ------------------------------------------------- |
| **P0**   | PHP oracle E2E, verify playbooks, Hub evidence UI                             | Random matrix pairs                               |
| **P0**   | Laravel/plain PHP ingest from verify gaps                                     | CWL RFC without replay                            |
| **P1**   | CWL HTTP + full-stack surface (body, response, effects, authoring/runtime UX) | Vanity matrix pairs without customer route        |
| **P1**   | Project-to-CWL export                                                         | Hub UI without delivery metrics                   |
| **P1**   | CWL runtime acceleration with parity gates                                    | Runtime claims without verify parity              |
| **P1**   | Phase 10: production SQL/session, WordPress entry, matrix expansion             | 575×26 marketing matrix                           |
| **P2**   | Second oracle origin                                                          | Rust/Kotlin oracle before Node/Python flagship    |
| **P2**   | WordPress vertical (Phase 10 entry)                                           | Many literal-only gold suites                     |


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
- Promising **any web app, any language** without second-oracle flagship evidence  
- LLM repair that bypasses verify  
- Rebranding structural-only matrix depth as full-stack oracle parity

**Amended 2026-06-19 (Phase 11):** Honest gaps implementation (**G6280–G6290**) — WordPress customer sample oracle, north-star metrics automation, commercial launch verify, IR helper B6, WPTP D7 harness. See `docs/HONEST-GAPS-PHASE-11.md`.

**Amended 2026-06-19 (Phase 12):** WISP Module_Manager full CWL flagship (**G6300–G6310**) — local GCE two-VM stack, scenario inventory, API proxy CWL, chimera gateway. See `docs/WISP-CWL-FULLSTACK-PROGRAM.md`.

**Amended 2026-06-19 (Phase 13 — CWL surfaces):** Formal **CWL surface taxonomy** (**D6193**, **G6340**): CWL API / Pages / Data / UI / Effects as named layers of one web language; Phase 13 closes surfaces on WISP module waves. See `docs/CWL-SURFACE-TAXONOMY.md`.

**Amended 2026-06-19 (Phase 14 — HSS operator):** **DESIGN D6204** — HSS chimera deploy to operator backend. **GenieACS is WISPTools legacy — not Chrysalis POC scope** (**D6205**).

---

**Amended 2026-06-22 (Phase 15–18 — D6206):** **CWL complete web language** is the active product path after **G6750**. Phases **15 (UI) → 16 (Data) → 17 (Effects) → 18 (cutover)**; close **G7150**. IR helper maintenance (**G6731**) is subordinate. See [`CWL-LANGUAGE-PROGRAM.md`](./CWL-LANGUAGE-PROGRAM.md).

**Amended 2026-06-19 (Phase 14 close — G6690):** HSS operator deploy program archived; operator regression via **G6590** / **G6690**.

**Amended 2026-06-19 (POC vs language — D6205):** **CWL is authoritative.** WISP **exists solely to showcase the language** — not to define it. GenieACS removed from Chrysalis consideration (WISPTools original design only).

---

## 12. Default queue (post G7150 — maintenance + regression)

**Status:** **CWL complete language closed** (**G7150**, **D6208**); Phases **15–18 closed** (**G7110–G7140**); **CWL language v1 closed** (**G6750**); **Phase 14 closed** (**G6690**); **Phase 13 closed** (**G6410**); **Phase 12 Phase 0 closed** (**G6310**).

When the user says "build" without specifying:

1. **IR helper maintenance (default)** — [`PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) §2; `hub:cwl-language-maintenance-smoke` (**G6731**)
2. **CWL complete language regression** — `hub:cwl-complete-language-close-smoke` (**G7150**), phase smokes **G7110–G7140**
3. **Phase 14 operator regression** — `hub:wisp-cwl-program-maintenance-complete-smoke` (**G6720**), `hub:wisp-cwl-maintenance-regression-smoke` (**G6710**), `hub:wisp-cwl-phase14-program-close-smoke` (**G6690**), `hub:wisp-cwl-phase14-close-smoke` (**G6590**)
4. **Phase 13 regression** — `hub:wisp-cwl-phase13-close-smoke` (**G6410**)

**Close before build:** Do not add GenieACS/ACS to CWL RFC or verify gates — **GenieACS is WISPTools legacy — not Chrysalis POC scope** (**D6205**).

**Program close (shipped):** **G7150** — `pnpm run hub:cwl-complete-language-close-smoke`.

Closed programs: Phase 10, Phase 11, Phase 14 operator, language v1 (**G6750**), **CWL complete language Phases 15–18** (**G7150**).

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

---

## 12 (archived) — Default queue (maintenance-only, superseded 2026-06-22)

Superseded by **D6206** §12 above. Maintenance-only default applied between **G6750** and **D6206**.

---

## 13. Amending this plan

1. User explicitly requests a strategy change.
2. Add `**DESIGN.md` Decision Log** entry (why).
3. Edit this file and `**ROADMAP.md`** strategic section.
4. Do not silently implement off-plan work.

---

*Related: `DESIGN.md`, `ROADMAP.md`, `docs/PAUSED-AND-MAINTENANCE.md`, `docs/CWL-SURFACE-TAXONOMY.md`, `docs/CWL.md`.*