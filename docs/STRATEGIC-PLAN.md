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

**Strategic plan phases 0–9:** all reinforcement queues **closed** (**G5680–G6153**). Default build → **maintenance** unless plan amended.

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

## 12. Default queue (maintenance)

**Status:** **maintenance only** (2026-06-18). Strategic plan phases **0–9** and Next 90 days are **closed** (**G5680–G6153**).

When the user says "build" without specifying:

1. Prefer **maintenance** triggers in [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) §2.
2. Do **not** reopen closed programs without §13 amendment.
3. Historical ship log (G5680–G6153): [`docs/archive/STRATEGIC-PLAN-SHIPPED-LOG.md`](./archive/STRATEGIC-PLAN-SHIPPED-LOG.md).
4. Verify governance: `pnpm run hub:maintenance-mode-governance-smoke` (**G6160**).

**Paused items, honest gaps, and archive pointers:** single index → [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

### Without plan amendment, do not build

| Blocked | Pointer |
| --- | --- |
| Unpause production SQL/session (Runtime Phase C) | [`PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) §4 |
| WordPress vertical, matrix gold marketing, "any language production-ready" | §3 |
| New phased program (Phase 10+) | §7 |
| Treating archive ship logs as active backlog | §6 |

---

## 13. Amending this plan

1. User explicitly requests a strategy change.
2. Add `**DESIGN.md` Decision Log** entry (why).
3. Edit this file and `**ROADMAP.md`** strategic section.
4. Do not silently implement off-plan work.

---

*Related: `DESIGN.md`, `ROADMAP.md`, `docs/PAUSED-AND-MAINTENANCE.md`, `docs/HUB-CROSS-LANGUAGE-SYNTHESIS.md`, `docs/CWL.md`.*