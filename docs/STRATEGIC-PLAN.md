# Chrysalis — Strategic plan (locked)

> **Status:** locked (2026-05-26)  
> **Authority:** This document governs *what to build and in what order*. It does not override `**DESIGN.md`** non-negotiables or `**ROADMAP.md**` mechanics.  
> **Operator stack (what ships today):** [`MIGRATION-OS.md`](./MIGRATION-OS.md)  
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

**Default build queue:** **CWL universal web language program active** (**G7300**, **D6260**) — Phase **19 → 23**; subordinate **G7200** + **G7150** regression. See [`CWL-UNIVERSAL-LANGUAGE-PROGRAM.md`](./CWL-UNIVERSAL-LANGUAGE-PROGRAM.md).

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
- **Regression:** Phase 13–14 WISP smokes optional (**D6259**)

---

### Phase 19 — CWL UI v1 (**closed G7310**)

- **Authority:** **DESIGN D6260** — [`CWL-UNIVERSAL-LANGUAGE-PROGRAM.md`](./CWL-UNIVERSAL-LANGUAGE-PROGRAM.md); RFC-0019 (UI v1: islands, hydration policy)
- **Close G7310:** `pnpm run hub:cwl-phase19-close-smoke`

### Phase 20 — CWL Data v2 (**closed G7320**)

- **Authority:** RFC-0013 v2 — parallel loads, redirects, errors; SvelteKit/Next server ingest
- **Close G7320:** `pnpm run hub:cwl-phase20-close-smoke`

### Phase 21 — CWL Effects middleware (**closed G7330**)

- **Authority:** RFC-0020 — executable effect chains beyond session (authz, CSRF, CORS)
- **Close G7330:** `pnpm run hub:cwl-phase21-close-smoke`

### Phase 22 — Universal ingest (**closed G7340**)

- **Authority:** Multi-origin ingest at pilot scale — PHP + SvelteKit/Next/OpenAPI → CWL default output
- **Close G7340:** `pnpm run hub:cwl-phase22-close-smoke`

### Phase 23 — Greenfield cutover template (**closed G7350**)

- **Authority:** Ladder step 5 for **new apps** — CWL-only module, no chimera for app logic
- **Close G7350:** `pnpm run hub:cwl-phase23-close-smoke`

### CWL universal web language close (**closed G7390**)

- **Win:** Phases **19–23** + **G7150** + **G7200** regression composite green
- **Smoke:** `pnpm run hub:cwl-universal-language-close-smoke`
- **Program doc:** [`CWL-UNIVERSAL-LANGUAGE-PROGRAM.md`](./CWL-UNIVERSAL-LANGUAGE-PROGRAM.md)

---

### Phase 24 — Customer pilot at scale (**closed G7490**)

- **Authority:** **DESIGN D6262** / **D6263** — [`CWL-CUSTOMER-PILOT-PROGRAM.md`](./CWL-CUSTOMER-PILOT-PROGRAM.md)
- **Program close G7490:** `pnpm run hub:cwl-customer-pilot-close-smoke`

---

### Phase 25 — Fully complete web language (**closed G7590**)

- **Authority:** **DESIGN D6264** / **D6265** / **D6266** — [`CWL-FULL-WEB-LANGUAGE-PROGRAM.md`](./CWL-FULL-WEB-LANGUAGE-PROGRAM.md); [`CWL-UNIVERSAL-TRANSLATOR-PARITY.md`](./CWL-UNIVERSAL-TRANSLATOR-PARITY.md)
- **Requires:** **G7490** closed
- **Close verify:** `pnpm run hub:cwl-full-web-language-close-smoke` (**G7590**)

---

**Amended 2026-06-24 (WISP full site CWL — D6268):** Phase **27** active after **G7690**: CWL must **replace any website** web tier; **WISP** is first proof — native API, UI depth, auth, cutover; program close **G7790**. See [`WISP-FULL-SITE-CWL-PROGRAM.md`](./WISP-FULL-SITE-CWL-PROGRAM.md).

---

**Amended 2026-06-25 (WISP full site closed — D6269):** Phase **27** closed at **G7790**: WISP Module_Manager first full-site CWL proof; default maintenance **G7790** composite. See [`WISP-FULL-SITE-CWL-PROGRAM.md`](./WISP-FULL-SITE-CWL-PROGRAM.md).

### Phase 27 — WISP full site CWL replacement (**closed G7790**)

- **Authority:** **DESIGN D6268** — [`WISP-FULL-SITE-CWL-PROGRAM.md`](./WISP-FULL-SITE-CWL-PROGRAM.md)
- **Requires:** **G7690** closed
- **Charter:** `fixtures/hub-wisp-full-site-slice/chrysalis.wisp-full-site.v1.json`
- **Phase 27a — Charter:** **G7701** `pnpm run hub:wisp-phase27a-close-smoke`
- **Phase 27b — CWL API native:** **G7702** `pnpm run hub:wisp-phase27b-close-smoke`
- **Phase 27c — CWL UI depth:** **G7703** `pnpm run hub:wisp-phase27c-close-smoke`
- **Phase 27d — Auth + session:** **G7704** `pnpm run hub:wisp-phase27d-close-smoke`
- **Phase 27e — Integrations:** **G7705** `pnpm run hub:wisp-phase27e-close-smoke`
- **Phase 27f — Cutover:** **G7706** `pnpm run hub:wisp-phase27f-close-smoke`
- **Program close G7790:** `pnpm run hub:wisp-full-site-close-smoke`
- **Entry G7700:** `pnpm run hub:wisp-full-site-program-entry-smoke`

---

### Phase 26 — Universal translator N×N through CWL (**closed G7690**)

- **Authority:** **DESIGN D6267** — [`CWL-UNIVERSAL-TRANSLATOR-PROGRAM.md`](./CWL-UNIVERSAL-TRANSLATOR-PROGRAM.md)
- **Requires:** **G7590** closed
- **Charter:** `fixtures/hub-universal-translator-slice/chrysalis.translator-composer.v1.json`
- **Close verify:** `pnpm run hub:cwl-universal-translator-close-smoke` (**G7690**)

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

**Amended 2026-06-16 (WISP POC decoupled — D6259):** WISP Module_Manager showcase **decoupled from default CI/build**. Smokes, scripts, and optional weekly **`wisp-poc-regression`** workflow remain for operator demo refresh; default queue is **G7200 + G7150** only.

**Amended 2026-06-16 (CWL universal web language — D6260):** Phases **19–23** active locked path after **G7150**: **UI v1 → Data v2 → Effects middleware → Universal ingest → Greenfield cutover**; program close **G7390**. See [`CWL-UNIVERSAL-LANGUAGE-PROGRAM.md`](./CWL-UNIVERSAL-LANGUAGE-PROGRAM.md).

---

**Amended 2026-06-24 (CWL customer pilot — D6262):** Phase **24** active locked path after **G7390**: **charter → ingest → verify → cutover**; program close **G7490**. See [`CWL-CUSTOMER-PILOT-PROGRAM.md`](./CWL-CUSTOMER-PILOT-PROGRAM.md).

---

**Amended 2026-06-24 (CWL customer pilot closed — D6263):** Phase **24** shipped; program close **G7490**. Default queue → **G7490** regression. See [`CWL-CUSTOMER-PILOT-PROGRAM.md`](./CWL-CUSTOMER-PILOT-PROGRAM.md).

---

**Amended 2026-06-24 (Fully complete web language — D6264 / D6265):** Phase **25** active locked path after **G7490**: **charter → CWL 100% → translator parity → translator verify**; universal translator must meet **CWL-equivalent** evidence; program close **G7590**. See [`CWL-FULL-WEB-LANGUAGE-PROGRAM.md`](./CWL-FULL-WEB-LANGUAGE-PROGRAM.md).

**Amended 2026-06-24 (Phase 25 program close — D6266):** **G7590** closed — fully complete web language + universal translator at CWL parity; default queue is **G7590 regression** + maintenance.

**Amended 2026-06-24 (Universal translator N×N closed — D6267):** Phase **26** closed at **G7690**: composer charter, CWL outbound, mandatory roundtrip, cross-edges green; default maintenance **G7690** composite. See [`CWL-UNIVERSAL-TRANSLATOR-PROGRAM.md`](./CWL-UNIVERSAL-TRANSLATOR-PROGRAM.md).

**Amended 2026-06-27 (WISP production POC closed — D6271):** Phase **28** closed at **G7890**: operator contracts, post-G7790 pipeline, integration client UI, oracle trace pilot replay green (**G7805**); default maintenance **G7890** composite. See [`WISP-PRODUCTION-POC-PROGRAM.md`](./WISP-PRODUCTION-POC-PROGRAM.md).

**Amended 2026-06-27 (WISP production completion closed — D6272):** Phase **29** closed at **G7990**: full API oracle corpus (**109** routes, **G7905**), CWL static export (**87** pages, **G7904**), operator contract smoke (**G7906**); default maintenance **G7990** composite. See [`WISP-PRODUCTION-COMPLETION-PROGRAM.md`](./WISP-PRODUCTION-COMPLETION-PROGRAM.md).

**Amended 2026-06-16 (WISP CWL UI parity — D6274):** Phase **31** active after **G7990**: bulk Svelte lift, anchor parity (login/dashboard/plan/deploy/map), forbidden-stub crawler + chimera HTTP probes; program close **G8100**. See [`WISP-CWL-UI-PARITY-PROGRAM.md`](./WISP-CWL-UI-PARITY-PROGRAM.md).

**Amended 2026-06-26 (WISP production POC — D6270):** Phase **28** active after **G7790**: operator HTTP contracts, post-G7790 pipeline, integration client UI, honest oracle trace pilot; program close **G7890**. See [`WISP-PRODUCTION-POC-PROGRAM.md`](./WISP-PRODUCTION-POC-PROGRAM.md).

**Amended 2026-07-03 (Phase 42 LLM-assisted convert — D6302):** Phase **42** closed at **G8830**: bounded verify-gated LLM propose layer on convert workflows — **not** a bypass around WebIR/ingest/emit/oracle. Subordinate to **G8550** maintenance. See [`LLM-ASSISTED-CONVERT-PROGRAM.md`](./LLM-ASSISTED-CONVERT-PROGRAM.md).

---

## 12. Default queue (maintenance — post Phase 41/42 close)

**Status:** **Phase 41 closed** (**G8790**, **D6301** — 2026-07-03); **Phase 42 closed** (**G8830**, **D6302** — 2026-07-03); **Phase 32 closed** (**G8290**); **Phase 40 closed** (**G8600** / **G8610**); **Migration OS closed** (**G8550**); **G6731** subordinate regression.

When the user says "build" without specifying:

1. **G8550 composite** — `pnpm run hub:migration-os-close-smoke` (includes **G8560** + **G8600**)
2. **G8570 Open Legacy wedge** — `pnpm run hub:site-port-open-legacy-wedge-smoke`
3. **G6731 CWL language maintenance** — `pnpm run hub:cwl-language-maintenance-smoke` (subordinate)

**Closed program regression:** `hub:full-matrix-oracle-close-smoke` (**G8790**) · `hub:llm-assisted-convert-close-smoke` (**G8830**) · `hub:open-web-llm-close-smoke` (**G8290**) · `hub:is-runtime-close-smoke` (**G8600**) · `hub:cwl-universal-translator-close-smoke` (**G7690**)

**Operator demo:** `pnpm run migration-evidence:demo`  
**GCE Migration OS:** `pnpm run test:gce:migration-os`  
**GPU lab dry-run:** `pnpm run gpu-lab:gce`  
**VMF hub:** `pnpm run federation:serve`

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) — Default queue (Phase 41 — Full matrix oracle product active, superseded 2026-07-03 by maintenance)

**Status:** **Phase 41 active** (**G8700**, **D6300** — user-amended 2026-07-03); **Phase 32 closed** (**G8290**); **Phase 40 closed** (**G8600** / **G8610**); **Migration OS closed** (**G8550**); **G6731** subordinate regression.

When the user says "build" without specifying:

1. **G8701 matrix progress** — `pnpm run hub:full-matrix-oracle-progress-smoke` (honest grade census)
2. **G8711 build slice** — `pnpm run hub:phase41-llm-build-slice-smoke` (41a.1 req/res + IS corpus refresh **G8610**)
3. **G8710 → G8750** — Phase 41 tracks in order ([`FULL-MATRIX-ORACLE-PROGRAM.md`](./FULL-MATRIX-ORACLE-PROGRAM.md))
4. **G8550 / G8570 maintenance** — after each track merge
5. **G7690** universal translator regression — subordinate

**Program entry:** `pnpm run hub:full-matrix-oracle-program-entry-smoke` (**G8700**)  
**Program close:** `pnpm run hub:full-matrix-oracle-close-smoke` (**G8790**)

---

## 12 (archived) — Default queue (post Phase 32 — maintenance only, superseded 2026-07-03 by Phase 41)

**Status:** **Phase 40 active** (**G8600**, **D6295**); **Phase 40b active** (**G8610**, **D6296** — CPU prep + optional GPU lab); **Phase 39 closed** (**G8570**); **Intelligence Shorthand export closed** (**G8560**); **Migration OS closed** (**G8550**).

When the user says "build" without specifying:

1. **G8600 composite** — `pnpm run hub:is-runtime-close-smoke` (tier retrieval + skip-LLM routing)
2. **G8610 IS-T2 prep** — `pnpm run hub:is-t2-lora-prep-smoke` (train manifest; no GPU spend)
3. **G8550 composite** — `pnpm run hub:migration-os-close-smoke` (includes **G8560** + **G8600**)
4. **G8310 unified POC** — `pnpm run hub:wisp-web-llm-poc-close-smoke` (includes **G8560**; add **`CHRYSALIS_G8310_LIVE=1`** for G8320)
5. **G8570 wedge regression** — `pnpm run hub:site-port-open-legacy-wedge-smoke`
6. **G8290 web-LLM framework** — `pnpm run hub:open-web-llm-close-smoke`

**Operator demo:** `pnpm run migration-evidence:demo`  
**IS export:** `pnpm run web-llm:export-shorthand` / `chrysalis federation export-shorthand`  
**IS-T2 prep (CPU):** `pnpm run gpu-lab:prep` · **GPU lab (on/off):** [`GCE-GPU-LAB.md`](./GCE-GPU-LAB.md)  
**VMF hub:** `pnpm run federation:serve`  
**GCE WISP refresh:** `pnpm run wisp:deploy:gce` then `pnpm run wisp:operator-verify -- --require`  
**GCE Migration OS + live (G8320):** `pnpm run test:gce:migration-os:wisp-live`  
**Nightly CI:** `.github/workflows/open-legacy-index-nightly.yml`

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) — Default queue (post G8560 — Intelligence Shorthand closed, superseded 2026-06-16)

**Status:** **Intelligence Shorthand closed** (**G8560**, **D6290**); **Migration OS closed** (**G8550**, **D6288**); **Phase 38 closed** (**G8540**).

When the user says "build" without specifying:

1. **G8550 composite** — `pnpm run hub:migration-os-close-smoke` (includes **G8560** IS close)
2. **G8560 composite** — `pnpm run hub:intelligence-shorthand-close-smoke` (CPU only)
3. **G8540 composite** — `pnpm run hub:site-port-federation-hub-close-smoke`
4. **G8480 composite** — `pnpm run hub:migration-evidence-poc-close-smoke`

**Operator demo:** `pnpm run migration-evidence:demo`  
**IS export:** `pnpm run web-llm:export-shorthand` / `chrysalis federation export-shorthand`  
**VMF hub:** `pnpm run federation:serve`  
**Nightly CI:** `.github/workflows/open-legacy-index-nightly.yml`

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) — Default queue (post G8550 — Migration OS closed, superseded 2026-06-16)

**Status:** **Migration OS closed** (**G8550**, **D6288**); **Phase 38 closed** (**G8540**, **D6287**); **Phase 37 closed** (**G8520**, **D6286**); **Phase 35 closed** (**G8480**, **D6284**).

When the user says "build" without specifying:

1. **G8550 composite** — `pnpm run hub:migration-os-close-smoke`
2. **G8540 composite** — `pnpm run hub:site-port-federation-hub-close-smoke`
3. **G8520 composite** — `pnpm run hub:site-port-open-legacy-close-smoke`
4. **G8480 composite** — `pnpm run hub:migration-evidence-poc-close-smoke`

**Operator demo:** `pnpm run migration-evidence:demo`  
**VMF hub:** `pnpm run federation:serve`  
**Nightly CI:** `.github/workflows/open-legacy-index-nightly.yml`

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) — Default queue (post G8530 — Phase 38 VMF hub API active, superseded 2026-06-16)

**Status:** **Phase 38 VMF local hub API active** (**G8530**, **D6287**); **Phase 37 closed** (**G8520**, **D6286**); **Phase 35 closed** (**G8480**, **D6284**).

When the user says "build" without specifying:

1. **G8530 composite** — `pnpm run hub:site-port-federation-hub-api-smoke`
2. **G8520 composite** — `pnpm run hub:site-port-open-legacy-close-smoke`
3. **G8480 composite** — `pnpm run hub:migration-evidence-poc-close-smoke`
4. **G8500 subordinate** — `pnpm run hub:site-port-open-legacy-index-close-smoke`
5. **G8510 subordinate** — `pnpm run hub:site-port-open-legacy-nightly-smoke`

**Operator demo:** `pnpm run migration-evidence:demo`  
**VMF hub:** `pnpm run federation:serve`  
**Nightly CI:** `.github/workflows/open-legacy-index-nightly.yml`

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) — Default queue (post G8510 — Phase 37 Open Legacy expansion active, superseded 2026-06-16)

**Status:** **Phase 31 WISP CWL UI parity closed** (**G8100**, **D6274**); **WISP production completion closed** (**G7990**); **WISP production POC closed** (**G7890**); **WISP full site closed** (**G7790**).

When the user says "build" without specifying:

1. **G8100 composite** — `pnpm run hub:wisp-cwl-ui-parity-close-smoke` (bulk lift + anchor parity + forbidden-stub scan + chimera probes)
2. **G7990 subordinate** — `pnpm run hub:wisp-production-completion-close-smoke`
3. **G7890 subordinate** — included in **G7990**
4. **IR helper tier regression (optional)** — `hub:cwl-language-maintenance-smoke` (**G6731**)

**Apply chain (fixture refresh):** post-G7790 chain → Phase 28g → **Phase 31 bulk lift** → Phase 30 → Phase 30b (`wisp:full-build` / `prepareWispCwlDeployBundle`)

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) — Default queue (post G7990 — Phase 31 WISP CWL UI parity active, superseded 2026-06-16)

**Status:** **WISP production completion program closed** (**G7990**, **D6272**); **WISP production POC closed** (**G7890**); **WISP full site closed** (**G7790**); **universal translator closed** (**G7690**).

When the user says "build" without specifying:

1. **G7990 composite** — `pnpm run hub:wisp-production-completion-close-smoke` (includes Phase 29 + **G7890** regression)
2. **G7890 subordinate** — `pnpm run hub:wisp-production-poc-close-smoke`
3. **G7790 subordinate** — included in **G7890** composite
4. **G7690 subordinate** — included in **G7790** composite
5. **IR helper tier regression (optional)** — `hub:cwl-language-maintenance-smoke` (**G6731**)

**Apply chain (fixture refresh):** `pnpm run wisp:apply-post-g7790-chain`

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) — Default queue (post G7890 — WISP production POC closed, superseded 2026-06-27)

**Status:** **WISP production POC program closed** (**G7890**, **D6271**); **WISP full site closed** (**G7790**); **universal translator closed** (**G7690**).

When the user says "build" without specifying:

1. **G7890 composite** — `pnpm run hub:wisp-production-poc-close-smoke` (includes Phase 28 + **G7790** regression)
2. **G7790 subordinate** — `pnpm run hub:wisp-full-site-close-smoke`
3. **G7690 subordinate** — included in **G7790** composite
4. **IR helper tier regression (optional)** — `hub:cwl-language-maintenance-smoke` (**G6731**)

**Apply chain (fixture refresh):** `pnpm run wisp:apply-post-g7790-chain`

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) — Default queue (Phase 28 — WISP production POC active, superseded 2026-06-27)

**Status:** **WISP production POC program active** (**G7800**, **D6270**); **WISP full site closed** (**G7790**); **universal translator closed** (**G7690**).

When the user says "build" without specifying:

1. **Phase 28a → 28d** in order — close gates **G7801–G7805** before **G7890**
2. **G7890 composite** — `pnpm run hub:wisp-production-poc-close-smoke` (includes **G7790** regression)
3. **G7790 subordinate** — `pnpm run hub:wisp-full-site-close-smoke`
4. **IR helper tier regression (optional)** — `hub:cwl-language-maintenance-smoke` (**G6731**)

**Apply chain:** `pnpm run wisp:apply-post-g7790-chain`

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) — Default queue (post G7790 — WISP full site closed, superseded 2026-06-26)

**Status:** **WISP full site CWL program closed** (**G7790**, **D6268**); **universal translator closed** (**G7690**); **WISP POC optional regression** preserved (**D6259**).

When the user says "build" without specifying:

1. **G7790 composite** — `pnpm run hub:wisp-full-site-close-smoke` (includes Phase 27 + **G7690** regression)
2. **G7690 subordinate** — `pnpm run hub:cwl-universal-translator-close-smoke`
3. **IR helper tier regression (optional)** — `hub:cwl-language-maintenance-smoke` (**G6731**)

**WISP POC (optional):** `.github/workflows/wisp-poc-regression.yml` — legacy operator path only.

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) — Default queue (Phase 27 — WISP full site active, superseded 2026-06-25)

**Status:** **WISP full site CWL program active** (**G7700**, **D6268**); **universal translator closed** (**G7690**); **WISP POC optional regression** preserved (**D6259**).

When the user says "build" without specifying:

1. **Phase 27a → 27f** in order — close gates **G7701–G7706** before advancing
2. **G7790 composite** — `pnpm run hub:wisp-full-site-close-smoke` (includes **G7690** regression)
3. **G7690 subordinate** — `pnpm run hub:cwl-universal-translator-close-smoke`
4. **IR helper tier regression (optional)** — `hub:cwl-language-maintenance-smoke` (**G6731**)

**WISP POC (optional):** `.github/workflows/wisp-poc-regression.yml` — legacy operator path only.

**Program close (target):** **G7790** — `pnpm run hub:wisp-full-site-close-smoke`.

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) — Default queue (post G7690 — universal translator N×N closed, superseded 2026-06-24)

**Status:** **CWL universal translator program closed** (**G7690**, **D6267**); **full web language closed** (**G7590**); **customer pilot closed** (**G7490**); **WISP POC decoupled** (**D6259**).

When the user says "build" without specifying:

1. **G7690 regression** — `pnpm run hub:cwl-universal-translator-close-smoke` (includes **G7590** subordinate)
2. **IR helper tier regression (optional)** — `hub:cwl-language-maintenance-smoke` (**G6731**)

**WISP POC (optional):** `.github/workflows/wisp-poc-regression.yml` — not default CI (**D6259**).

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) — Default queue (Phase 26 — universal translator N×N active, superseded 2026-06-24)

**Status:** **CWL universal translator program active** (**G7600**, **D6267**); **full web language closed** (**G7590**); **customer pilot closed** (**G7490**); **WISP POC decoupled** (**D6259**).

When the user says "build" without specifying:

1. **Phase 26a → 26d** in order — close gates **G7601–G7604** before advancing
2. **G7690 composite** — `pnpm run hub:cwl-universal-translator-close-smoke` (includes **G7590** regression)
3. **G7590 subordinate** — `pnpm run hub:cwl-full-web-language-close-smoke`
4. **IR helper tier regression (optional)** — `hub:cwl-language-maintenance-smoke` (**G6731**)

**WISP POC (optional):** `.github/workflows/wisp-poc-regression.yml` — not default CI (**D6259**).

**Program close (target):** **G7690** — `pnpm run hub:cwl-universal-translator-close-smoke`.

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) — Default queue (post G7590 — fully complete web language closed, superseded 2026-06-24)

**Status:** **CWL full web language program closed** (**G7590**, **D6266**); **customer pilot closed** (**G7490**); **universal language closed** (**G7390**); **WISP POC decoupled** (**D6259**).

When the user says "build" without specifying:

1. **G7590 regression** — `pnpm run hub:cwl-full-web-language-close-smoke` (includes **G7490** + Phase 25 composite)
2. **G7490 subordinate** — `pnpm run hub:cwl-customer-pilot-close-smoke`
3. **IR helper tier regression (optional)** — `hub:cwl-language-maintenance-smoke` (**G6731**)

**WISP POC (optional):** `.github/workflows/wisp-poc-regression.yml` — not default CI (**D6259**).

**Program regression:** **G7590** — `pnpm run hub:cwl-full-web-language-close-smoke`.

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) — Default queue (Phase 25 active — superseded 2026-06-24)

**Status:** **CWL full web language program active** (**G7500**, **D6264**); **customer pilot closed** (**G7490**); **universal language closed** (**G7390**); **WISP POC decoupled** (**D6259**).

When the user says "build" without specifying:

1. **Phase 25a → 25d** in order — close gates **G7501–G7504** before advancing
2. **G7590 composite** — `pnpm run hub:cwl-full-web-language-close-smoke` (includes **G7490** regression)
3. **G7490 subordinate** — `pnpm run hub:cwl-customer-pilot-close-smoke`
4. **IR helper tier regression (optional)** — `hub:cwl-language-maintenance-smoke` (**G6731**)

**WISP POC (optional):** `.github/workflows/wisp-poc-regression.yml` — not default CI (**D6259**).

**Program close (target):** **G7590** — `pnpm run hub:cwl-full-web-language-close-smoke`.

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) — Default queue (post G7490 — customer pilot closed, superseded 2026-06-24)

**Status:** **CWL universal web language program closed** (**G7390**, **D6260**); **CWL complete language closed** (**G7150**); **IR Helper Program v1 closed** (**G7200**); **WISP POC decoupled** (**D6259**).

When the user says "build" without specifying:

1. **G7390 regression** — `pnpm run hub:cwl-universal-language-close-smoke`
2. **G7150 / G7200** — subordinate (`pnpm run hub:cwl-complete-language-close-smoke`, `pnpm run hub:ir-helper-program-close-smoke`; included in G7390 composite)
3. **IR helper tier regression (optional)** — `hub:cwl-language-maintenance-smoke` (**G6731**)

**WISP POC (optional):** `.github/workflows/wisp-poc-regression.yml` — not default CI (**D6259**).

**Program close (shipped):** **G7390** — `pnpm run hub:cwl-universal-language-close-smoke`.

**Shipped milestone:** **G7150** — `pnpm run hub:cwl-complete-language-close-smoke`.

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

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