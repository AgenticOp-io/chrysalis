# Chrysalis — Strategic plan (locked)

> **Status:** locked (2026-05-26)  
> **Authority:** This document governs *what to build and in what order*. It does not override `**DESIGN.md`** non-negotiables or `**ROADMAP.md**` mechanics.  
> **Operator stack (what ships today):** [`MIGRATION-OS.md`](./MIGRATION-OS.md)  
> **For AI assistants:** Read `**AGENTS.md`** § “Strategic path (locked)” before planning or implementing.

---

## 0. How to use this document


| User message sounds like                            | Treat as                                                                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| “Build …”, “Implement …”, “Add …”, “Fix …”          | Implementation request (still must fit this plan) — **true conversion only** (**D6442**/**D6447**)          |
| “What if …”, “Should we …”, “Can we …”, “Explain …” | **Clarification** — answer in plan terms; **do not fork** unless user explicitly approves a plan change     |
| “Also do X” without “build”                         | **Question** — is X on-plan or off-plan? Say which phase/workstream it belongs to, or that it is **paused** |
| “Forget the plan, do Y” / “rewrite the plan …”      | Requires **explicit** plan amendment: `DESIGN.md` Decision Log + edit canon + this file                   |
| “Do not add new code” / “only translate” / “stop making things up” / “no demo code” | **D6442**/**D6447** — translation / holes / plan docs only; **refuse** façades and invented helpers |
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
| **Universal Translator** — AI-assisted web conversion through **WebIR + CWL**, with **LLM / Intelligence Shorthand** proposing and **oracle/verify** disposing (**D6437**) | **WISP Module_Manager** — optional **showcase lab** only; **not** engine code, not the product name |
| **CWL** — consolidated web language (API, Pages, Data, UI, Effects) over WebIR | POC exists solely to evidence surface waves — wins must **generalize** into packages / `scripts/lib` |
| Success = language + engine + verify truth + chartered N×N edges | Success on WISP = transferable gate evidence — never bake `wisp` into package APIs |

WISP-named scripts under `scripts/` are **legacy/POC**; prefer `scripts/lib/*`. **GenieACS is standalone C (WISPTools legacy) — permanently out of Chrysalis scope** (**D6205**, **D6370**).

**Path document:** [`UNIVERSAL-TRANSLATOR-CANON.md`](./UNIVERSAL-TRANSLATOR-CANON.md) (**canon, D6438**) · [`UNIVERSAL-TRANSLATOR-PATH.md`](./UNIVERSAL-TRANSLATOR-PATH.md) (historical notes) · **Attempt database:** [`initiative-knowledge.v1.json`](./initiative-knowledge.v1.json)

---

## 1. One-sentence strategy

**Ship the AI-assisted Universal Translator:** WebIR + CWL as hub, LLM/IS propose, oracle/verify dispose — **translate only**, make the translation work (**D6442**). **Never demo-only code** (**D6447**) — true conversion of origin, or an honest hole. **Canon:** [`UNIVERSAL-TRANSLATOR-CANON.md`](./UNIVERSAL-TRANSLATOR-CANON.md) (**D6438** + **D6442**/**D6447** §2A). WISP is POC only. **Refuse invention** (Bing/OSM map engines when source is ArcGIS; CDN dialects; net-new chrome; parity façades).

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

**Amended 2026-07-14 (D6442 — translate-only fidelity law).** Reset after ArcGIS map dialectic / invented loaders. **Only translate** source → WebIR/CWL → emit; preserve ArcGIS as ArcGIS (not Bing/OSM invents); holes over substitutes; no new invented code when ordered translate-only. Canon §2A. Extends **D6441** vendor islands.

**Amended 2026-07-14 (D6441 — vendor islands preserved).** Third-party SDK add-ins (`@arcgis/core`, charts, Firebase client, etc.) stay as **source client islands**: same package + origin toolchain (e.g. Module_Manager Vite). CWL owns shell/contracts/holes — **do not rewrite** vendors to CDN AMD/ESM or alternate bundler dialects. See DESIGN **D6441** / **D6442**; WISP hole `hub-svelte:arcgis-map`.

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

**Amended 2026-07-06 (Phase 46 close — D6343):** Phase **46** **closed** at **G9290**: waves **6–7** (**180/601** oracle-product), CWL runtime deploy (**G9240**); default queue returns to **G8550** maintenance. See [`PHASE-46-PROGRAM.md`](./PHASE-46-PROGRAM.md).

**Amended 2026-07-06 (Phase 46 — D6341):** Phase **46** **active** at **G9250**: matrix waves **6–7** + **CWL runtime depth** (browser/worker scaffolds, emit-runtime-cwl); requires **G9190** closed. See [`PHASE-46-PROGRAM.md`](./PHASE-46-PROGRAM.md).

**Amended 2026-07-06 (Phase 45 close — D6340):** Phase **45** **closed** at **G9190**: waves **4–5** (**178/601** oracle-product), WISP showcase default CI preserved; default queue returns to **G8550** maintenance. See [`PHASE-45-PROGRAM.md`](./PHASE-45-PROGRAM.md).

**Amended 2026-07-06 (Phase 45 CWL product supremacy — D6336):** Phase **45** **active** at **G9150**: default build prioritizes **CWL product evidence** — extended matrix wave maintenance, **WISP showcase in default CI** (supersedes **D6259** default-build bar), IR helper/CWL language first-class. See [`PHASE-45-PROGRAM.md`](./PHASE-45-PROGRAM.md).

**Amended 2026-07-04 (Phase 44 close — D6311):** Phase **44** **closed** at **G9140**: extended matrix waves 1–3 (**169/601** oracle-product), LLM hole-closure → repair bridge, Horizon C operator train contract — honest partial census, not 601-pair production parity. See [`PHASE-44-PROGRAM.md`](./PHASE-44-PROGRAM.md).

**Amended 2026-07-04 (Phase 44 — D6310):** Phase **44** active at **G9000**: extended hub matrix oracle waves (601-pair census), LLM hole-closure → repair bridge, in-repo Horizon C QLoRA train loop (operator GPU). See [`PHASE-44-PROGRAM.md`](./PHASE-44-PROGRAM.md).

**Amended 2026-07-03 (Phase 43 LLM convert full — D6303):** Phase **43** **closed** at **G8940**: LLM/stub hole enrichment, verify-gated operator apply, repair bridge, MCP **`hub_convert_apply_holes`** — extends closed Phase 42 without bypassing WebIR/oracle. See [`LLM-CONVERT-FULL-PROGRAM.md`](./LLM-CONVERT-FULL-PROGRAM.md).

## 12. Default queue (active)

**Amended 2026-07-15 (D6444) — Origin source corpus + piecemeal convert.** See canon §2C. Ingest all origin files → code DB → convert queue; background/API pieces are first-class.

**Amended 2026-07-15 (D6443) — Source-authoritative UI conversion.** See canon §2B. Origin CSS + class names + vendor islands are look/behavior authority; no overlay redefine.

**Amended 2026-07-17 (D6448) — Complete conversion protocol.** See [`COMPLETE-CONVERSION-PROTOCOL.md`](./COMPLETE-CONVERSION-PROTOCOL.md) and canon §2D. Convert must close holes during convert (honest loop) until zero or fail incomplete — all languages.

**Amended 2026-07-17 (D6447) — True conversion only; never demo-only code (all languages).** See canon §0/§2A and `AGENTS.md` absolute law. Applies to every origin→emit pair — WISP is POC proof only. Agents: lift origin or emit honest holes — **refuse** hand-built showcase pages, non-lifted parity shells, force-settled “green” holes. After convert: sign in and test against origin.

**Amended 2026-07-14 (D6442) — Translate-only fidelity law.** See canon §2A. Agents: translate / verify / holes only — **do not invent**.

**Amended 2026-07-14 (D6438) — Universal Translator Canon locked.**

**Canon:** [`UNIVERSAL-TRANSLATOR-CANON.md`](./UNIVERSAL-TRANSLATOR-CANON.md) — Waves **A–D** (**G9960–G9990**) + **§2A D6442**/**D6447**. WISP = POC only.

**Status:** **UT Canon program closed** (**G9990** — Waves A–D). Default queue = maintain canon + Migration OS + edge-only gold. WISP = POC only. **Map/SDK work:** preserve source ArcGIS (and other vendor) behavior — no dialect rewrite unless amending the plan again.

When the user says "build" without specifying:

1. **Maintain G9990** — `hub:ut-canon-program-close-smoke` + **G9991** `hub:ut-maintain-packaging-smoke` (**D6440**)
2. **G8550 composite** — `hub:migration-os-close-smoke`
3. **G7690 UT regression** — `hub:cwl-universal-translator-close-smoke`
4. **Origin gold only where a customer/chartered UT edge fails**
5. **Optional POC** — WISP / management.wisptools.io only if explicitly requested → **G9992** `hub:wisp-poc-from-scratch` ([`WISP-POC-FROM-SCRATCH.md`](./WISP-POC-FROM-SCRATCH.md)) — still **true conversion only** (**D6442**/**D6447**)

**Closed program regression:** `hub:ut-canon-program-close-smoke` (**G9990**) · `hub:ut-maintain-packaging-smoke` (**G9991**) · `hub:ut-wave-a-close-smoke` (**G9965**) · `hub:ut-wave-b-close-smoke` (**G9975**) · `hub:ut-wave-c-close-smoke` (**G9985**) · `hub:ut-wave-d-close-smoke` (**G9989**) · `hub:cwl-universal-translator-close-smoke` (**G7690**) · `hub:migration-os-close-smoke` (**G8550**) · `hub:multi-origin-lift-close-smoke` (**G9880**) · `hub:elixir-smoke` (**G9953**, foundation) · `hub:dart-smoke` (**G9954**, foundation) · `hub:complete-conversion-prove:elixir` (**G9955**, D6448-ST) · `hub:complete-conversion-prove:dart` (**G9956**, D6448-ST) · `hub:restify-smoke` (**G9957**) · `hub:polka-smoke` (**G9958**) · `hub:koa-smoke` / `hub:restify-smoke` / `hub:polka-smoke` v2 (**G9959**, pass-through mw) · `hub:cobol-clbs-prove-smoke` (**G10001**, CardDemo CSUTLDWY/CSSETATY COPY resolve) · `hub:contract-import-cwl-roundtrip-smoke` + `batch-ckprst-copy-resolve` (**G10002**) · `hub:fastapi-smoke` (**G10003**) · `hub:starlette-smoke` (**G10013**) · `hub:ktor-smoke` (**G10004**) · `hub:koa-smoke` / `hub:hapi-smoke` / `hub:restify-smoke` / `hub:polka-smoke` destructure (**G10005**) · `hub:dart-smoke` named handlers (**G10007**) · `hub:aspnet-controllers-smoke` (**G10008**) · `hub:jaxrs-smoke` (**G10012**) · `hub:chi-smoke` (**G10009**) · `hub:hummingbird-smoke` (**G10016**)

**Amended 2026-07-24 (D6474 / G10012) — JAX-RS Java secondary dialect.** `hub-gold-jaxrs` + `hub:jaxrs-smoke` (20/20). Peels class `@Path` prefix join + method `@GET|POST|…` + `@PathParam`/`@QueryParam`/`@DefaultValue` + `Map.of` + `Response.status().entity().build()`. Spring remains Java D6448-ST. CDI/filters/providers/Application = honest holes.

**Amended 2026-07-24 (D6478 / G10016) — Hummingbird Swift secondary dialect.** `hub-gold-hummingbird` + `hub:hummingbird-smoke` (20/20). Peels `router.get|post|…`, `:id` paths, `context.parameters.get`, `request.uri.queryParameters`, `Response(status:, body: HTTPBody(json:))`. Vapor remains Swift D6448-ST. Fluent/Leaf/auth/group = honest holes. Catalog: `fixtures/ci/swift-hummingbird-honest-holes.json`.

**Amended 2026-07-24 (D6471 / G10009) — Go Chi secondary dialect.** `hub-gold-chi` + `hub:chi-smoke` (20/20). Peels `r.Get|Post|…`, `{id}` paths, `chi.URLParam`, `r.URL.Query().Get`, `json.NewEncoder(w).Encode`, `w.WriteHeader(http.Status*)`. Gin remains Go D6448-ST. Middleware/Mount/non-literal paths = honest holes.

**Amended 2026-07-24 (D6470 / G10008) — ASP.NET controller secondary dialect.** `hub-gold-aspnet-controllers` + `hub:aspnet-controllers-smoke` (20/20). Peels `[ApiController]` + `[Route]` prefix join + `[HttpGet|Post|…]` + controller method bodies (`Results.Json`, scalars, path/query params, `statusCode:`). Minimal API remains C# D6448-ST. DI/filter pipeline/Razor = honest holes.

**Amended 2026-07-24 (D6469 / G10007) — Dart Shelf same-file named handlers.** Peel `router.get('/x', myHandler)` when `myHandler` is a same-file `Response|Future<Response> name(Request …)` function (Axum/Go Gin parallel). Cross-file named / Flutter / Frog / Pipeline stay honest holes. `hub:dart-smoke` + `hub:dart-flagship` remain 20/20 hole-free.

**Amended 2026-07-24 (D6468 / G10005) — Thin-Node IDENT destructure peel.** Shared JS AST peels `const { x } = ctx.params|query|request.body`, `request.params|query|payload`, `req.params|query` into CWL path/query/body request fields. Gold fixtures `hub-gold-koa|hapi|restify|polka` use destructure on 2 routes each; smokes stay 20/20 hole-free. Nested/computed/rest destructure = honest holes (no invent). No Koa onion / Hapi plugins / Nest DI.

**Amended 2026-07-24 (D6467 / G10004) — Ktor secondary dialect.** `hub-gold-ktor` + `hub:ktor-smoke` (20/20). Peels `routing { get|post|… }`, `{id}` paths, `call.parameters`, `call.request.queryParameters`, `HttpStatusCode` on `call.respond`. Spring remains Kotlin D6448-ST. Auth/plugins/nested routing = honest holes.

**Amended 2026-07-24 (D6475 / G10013) — Starlette secondary dialect.** `hub-gold-starlette` + `hub:starlette-smoke` (20/20). Peels `@app.route(..., methods=[...])`, `{id}` paths, `request.query_params`, Flask-style `(body, status)` tuple returns. Flask remains Python D6448-ST. Mount/middleware/ASGI onion / `Route()`-table-only = honest holes.

**Amended 2026-07-24 (D6466 / G10003) — FastAPI secondary dialect.** `hub-gold-fastapi` + `hub:fastapi-smoke` (20/20). Peels `{id}` paths, `request.query_params`, decorator `status_code=`. Flask remains Python D6448-ST. Depends/OAuth/middleware = honest holes.

**Amended 2026-07-24 (D6465 / G10002) — Contract request-surface deepen + CKPRST COPY + Nest ST board sync.** OpenAPI peels IDENT-safe `in: header` + flat `requestBody` example keys as CWL `header`/`body`; HAR peels IDENT-safe headers + flat JSON `postData`. Promote `CKPRST.cpy` + structural `CKPRSTCP`. NestJS route-surface ST listed on leadership scoreboard + public claim. CONTRIBUTING refuses private corpora on `main`. `/raw` and BMS maps stay honest holes.

**Amended 2026-07-24 (D6464 / G10001) — CardDemo CSUTLDWY/CSSETATY COPY resolve.** Promote date/set-attr copybooks into `fixtures/hub-cobol-clbs-mini/copybook/`; COACTUPC/COTRTUPC prove requires resolve. DFHAID/DFHBMSCA stay BMS holes (no invent). Behavioral still paused **61/61**. Scoreboard: [`LEADERSHIP-SCOREBOARD.md`](./LEADERSHIP-SCOREBOARD.md).

**Amended 2026-07-24 (D6463 / G9959) — Thin-Node pass-through middleware peel.** Empty/next-only `app.use` / Restify `server.pre|use` → `js.passthrough` / `restify.passthrough` presets. Complex middleware = honest holes (no onion invent). Scoreboard: [`LEADERSHIP-SCOREBOARD.md`](./LEADERSHIP-SCOREBOARD.md). Cheap deepen queue exhausted pending Flutter/LiveView/COBOL charter.

**Amended 2026-07-24 (D6462 / G9958) — Polka secondary dialect.** `hub-gold-polka` + `hub:polka-smoke` (20/20). Completes thin Node secondary set. Not ST. Phoenix controller peel skipped (not cheap; honest skip catalog).

**Amended 2026-07-24 (D6461 / G9957) — Restify secondary dialect.** `hub-gold-restify` + `hub:restify-smoke` (20/20). Shared JS AST: `del`→DELETE + Restify two-arg `res.send`. Not ST.

**Amended 2026-07-24 (D6460 / G9956) — Dart/Shelf route-surface D6448-ST.** `hub:dart-flagship` + `hub:complete-conversion-prove:dart` → `stGreen`+`stClosed`. Flutter/Dart Frog/Pipeline = honest holes. Phoenix peel deferred.

**Amended 2026-07-24 (D6459 / G9955) — Elixir Plug.Router route-surface D6448-ST.** `hub:elixir-flagship` + `hub:complete-conversion-prove:elixir` → `stGreen`+`stClosed`. Phoenix LiveView/controllers = honest holes (no invent).

**Amended 2026-07-24 (D6458 / G9954) — Dart/Shelf foundation.** Chartered Dart origin gold: `hub-gold-dart-shelf` + `hub:dart-smoke` (20/20 hole-free). Flutter/Dart Frog/Pipeline = honest holes. Phoenix controller peel deferred (no LiveView invent).

**Amended 2026-07-24 (D6457 / G9953) — Elixir Plug.Router foundation.** Chartered BEAM origin gold: `hub-gold-elixir-plug` + `hub:elixir-smoke` (20/20 hole-free). Phoenix LiveView/controllers = honest holes. Dart closed via D6458.

**Index:** [`UNIVERSAL-TRANSLATOR-CANON.md`](./UNIVERSAL-TRANSLATOR-CANON.md) · [`initiative-knowledge.v1.json`](./initiative-knowledge.v1.json) · [`MIGRATION-OS.md`](./MIGRATION-OS.md) · [`AI-ASSIST.md`](./AI-ASSIST.md) · [`PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md)

---

## 12 (archived) — Default queue (superseded 2026-07-14 by D6438)

**Amended 2026-07-14 (D6437) — Universal Translator reframing (WISP = POC only).** Superceded by **D6438** canon.

**Amended 2026-07-14 (D6436 / G9952) / 2026-07-13 (D6435 / G9951)** — WISP POC closes (Firebase look, module depth).

---

## 12 (archived) — Default queue (superseded 2026-07-13 by D6435 / G9951)

**Amended 2026-07-13 (D6434 / G9950) — Module_Manager buttons converted.**

**Status:** **G9950** closed. Plan/deploy toolbars + structural Search/Export/Scan + marketing spatial discover over API geometry. Prior map interact (**G9949**) / ArcGIS grind (**G9947–G9948**) remain. LiteRT refused. GenieACS OOS.

When the user says "build" without specifying:

1. **G8550 composite** — `hub:migration-os-close-smoke`
2. **Migration Chat / AI Assist regression** — `hub:migration-chat-smoke`
3. **Multi-origin regression** — `hub:multi-origin-lift-close-smoke` · `hub:multi-origin-convert-orch-smoke`
4. **WISP regression** — `hub:wisp-cwl-module-buttons-smoke` · `hub:wisp-cwl-map-interact-smoke` · arcgis/remaining smokes · `wisp:operator-verify -- --require`
5. **Optional Tier C entry** — only after an explicit plan amendment naming Blazor/ERB/Django/Flutter

**Closed program regression:** `hub:wisp-cwl-module-buttons-smoke` (**G9950**) · `hub:wisp-cwl-map-interact-smoke` (**G9949**) · `hub:wisp-cwl-arcgis-grind-smoke` (**G9947–G9948**) · `hub:migration-os-close-smoke` (**G8550**) · `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) · [`docs/AI-ASSIST.md`](./AI-ASSIST.md) · [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) · [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) — Default queue (superseded 2026-07-13 by D6434 / G9950)

**Amended 2026-07-13 (D6433 / G9949) — SharedMap↔ArcGIS interaction converted.**

**Status:** **G9949** closed. Plan/deploy chrome drives coverage-map via converted Module_Manager postMessage protocol (`state-update`, layers, Sketch rectangle, asset-click). Prior ArcGIS grind (**G9947–G9948**) remains. LiteRT refused. GenieACS OOS.

When the user says "build" without specifying:

1. **G8550 composite** — `hub:migration-os-close-smoke`
2. **Migration Chat / AI Assist regression** — `hub:migration-chat-smoke`
3. **Multi-origin regression** — `hub:multi-origin-lift-close-smoke` · `hub:multi-origin-convert-orch-smoke`
4. **WISP regression** — `hub:wisp-cwl-map-interact-smoke` · `hub:wisp-cwl-arcgis-grind-smoke` · remaining/admin smokes · `wisp:operator-verify -- --require`
5. **Optional Tier C entry** — only after an explicit plan amendment naming Blazor/ERB/Django/Flutter

**Closed program regression:** `hub:wisp-cwl-map-interact-smoke` (**G9949**) · `hub:wisp-cwl-arcgis-grind-smoke` (**G9947–G9948**) · `hub:migration-os-close-smoke` (**G8550**) · `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) · [`docs/AI-ASSIST.md`](./AI-ASSIST.md) · [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) · [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) — Default queue (superseded 2026-07-13 by D6433 / G9949)

**Amended 2026-07-13 (D6432 / G9947–G9948) — WISP ArcGIS + grind complete.**

**Status:** **G9947–G9948** closed. ArcGIS MapView overlays from `/api/coverage` + `/api/network` geometry; `/api/module-access` + PCI map host grind; mistaken Google key removed from ArcGIS config. LiteRT refused. GenieACS OOS.

When the user says "build" without specifying:

1. **G8550 composite** — `hub:migration-os-close-smoke`
2. **Migration Chat / AI Assist regression** — `hub:migration-chat-smoke`
3. **Multi-origin regression** — `hub:multi-origin-lift-close-smoke` · `hub:multi-origin-convert-orch-smoke`
4. **WISP regression** — `hub:wisp-cwl-arcgis-grind-smoke` · `hub:wisp-cwl-remaining-surface-smoke` · admin/ops surface smokes · `wisp:operator-verify -- --require`
5. **Optional Tier C entry** — only after an explicit plan amendment naming Blazor/ERB/Django/Flutter

**Closed program regression:** `hub:wisp-cwl-arcgis-grind-smoke` (**G9947–G9948**) · `hub:next-loading-font-smoke` (**G9944**) · `hub:angular-ngmodule-providers-smoke` (**G9945**) · `hub:vue-app-shell-css-smoke` (**G9946**) · `hub:migration-os-close-smoke` (**G8550**) · `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) · [`docs/AI-ASSIST.md`](./AI-ASSIST.md) · [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) · [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) — Default queue (superseded 2026-07-13 by D6432 / G9947–G9948)

**Amended 2026-07-13 (D6429–D6431 / G9944–G9946) — Next loading/font, Angular NgModule, Vue App.vue.**

**Status:** **G9944–G9946** closed. Next companion `loading.tsx` + `next/font` honesty holes; Angular `@NgModule` providers edges; Vue `App.vue` shell CSS. Multi-origin close schema **v4**. LiteRT refused. GenieACS OOS.

When the user says "build" without specifying:

1. **G8550 composite** — `hub:migration-os-close-smoke`
2. **Migration Chat / AI Assist regression** — `hub:migration-chat-smoke`
3. **Multi-origin regression** — `hub:multi-origin-lift-close-smoke` · `hub:multi-origin-convert-orch-smoke`
4. **WISP regression** — `hub:wisp-cwl-remaining-surface-smoke` · admin/ops surface smokes · `wisp:operator-verify -- --require`
5. **Optional Tier C entry** — only after an explicit plan amendment naming Blazor/ERB/Django/Flutter

**Closed program regression:** `hub:next-loading-font-smoke` (**G9944**) · `hub:angular-ngmodule-providers-smoke` (**G9945**) · `hub:vue-app-shell-css-smoke` (**G9946**) · `hub:angular-provided-in-smoke` (**G9941**) · `hub:vue-nuxt-layout-css-smoke` (**G9942**) · `hub:multi-origin-convert-orch-smoke` (**G9943**) · `hub:migration-os-close-smoke` (**G8550**) · `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) · [`docs/AI-ASSIST.md`](./AI-ASSIST.md) · [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) · [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) — Default queue (superseded 2026-07-13 by D6429–D6431 / G9944–G9946)

**Amended 2026-07-13 (D6426–D6428 / G9941–G9943) — Angular providedIn, Vue/Nuxt layouts, shared convert orch.**

**Status:** **G9941–G9943** closed. Angular `providedIn`/`providers` holes; Vue/Nuxt layout CSS isolation; `convertMultiOriginProjects` proves shared convert-site orchestration (Tier C precondition). Multi-origin close schema **v3**. LiteRT refused. GenieACS OOS.

When the user says "build" without specifying:

1. **G8550 composite** — `hub:migration-os-close-smoke`
2. **Migration Chat / AI Assist regression** — `hub:migration-chat-smoke`
3. **Multi-origin regression** — `hub:multi-origin-lift-close-smoke` · `hub:multi-origin-convert-orch-smoke`
4. **WISP regression** — `hub:wisp-cwl-remaining-surface-smoke` · admin/ops surface smokes · `wisp:operator-verify -- --require`
5. **Optional Tier C entry** — only after an explicit plan amendment naming Blazor/ERB/Django/Flutter

**Closed program regression:** `hub:angular-provided-in-smoke` (**G9941**) · `hub:vue-nuxt-layout-css-smoke` (**G9942**) · `hub:multi-origin-convert-orch-smoke` (**G9943**) · `hub:next-layout-css-depth-smoke` (**G9940**) · `hub:wisp-cwl-remaining-surface-smoke` (**G9932–G9939**) · `hub:migration-chat-smoke` (**G9921–G9923**) · `hub:migration-os-close-smoke` (**G8550**) · `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) · [`docs/AI-ASSIST.md`](./AI-ASSIST.md) · [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) · [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) — Default queue (superseded 2026-07-13 by D6426–D6428 / G9941–G9943)

**Amended 2026-07-13 (D6425 / G9940) — Next layout/globals CSS depth.**

**Status:** **G9940** closed. Ancestor App Router `layout` CSS attributed per route (nested portal isolation); multi-origin close schema **v2**. Prior **G9924–G9939** remain closed regression. LiteRT refused. GenieACS OOS.

When the user says "build" without specifying:

1. **G8550 composite** — `hub:migration-os-close-smoke`
2. **Migration Chat / AI Assist regression** — `hub:migration-chat-smoke`
3. **Multi-origin regression** — `hub:multi-origin-lift-close-smoke` · `hub:next-layout-css-depth-smoke`
4. **WISP regression** — `hub:wisp-cwl-remaining-surface-smoke` · admin/ops surface smokes · `wisp:operator-verify -- --require`

**Closed program regression:** `hub:next-layout-css-depth-smoke` (**G9940**) · `hub:wisp-cwl-remaining-surface-smoke` (**G9932–G9939**) · `hub:angular-di-graph-smoke` (**G9931**) · `hub:next-css-depth-smoke` (**G9930**) · `hub:migration-chat-smoke` (**G9921–G9923**) · `hub:migration-os-close-smoke` (**G8550**) · `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) · [`docs/AI-ASSIST.md`](./AI-ASSIST.md) · [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) · [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) — Default queue (superseded 2026-07-13 by D6425 / G9940)

**Amended 2026-07-13 (D6424 / G9932–G9939) — Remaining WISP empty-page hydrate unpaused.**

**Status:** **G9932–G9939** closed. Voice/plan/bundles/permissions/roles/CBRS/support structural hydrate shipped; `routes.cwl`/`inferUiPageApiPath` apiPath fixes; empty-list honesty (no invented FCAPS). Pause from **D6416** lifted after multi-origin language POCs. LiteRT refused. GenieACS OOS.

When the user says "build" without specifying:

1. **G8550 composite** — `hub:migration-os-close-smoke`
2. **Migration Chat / AI Assist regression** — `hub:migration-chat-smoke`
3. **Multi-origin regression** — `hub:multi-origin-lift-close-smoke` · `hub:angular-di-graph-smoke`
4. **WISP regression** — `hub:wisp-cwl-remaining-surface-smoke` · admin/ops surface smokes · `wisp:operator-verify -- --require`

**Closed program regression:** `hub:wisp-cwl-remaining-surface-smoke` (**G9932–G9939**) · `hub:angular-di-graph-smoke` (**G9931**) · `hub:next-css-depth-smoke` (**G9930**) · `hub:vue-scoped-css-depth-smoke` (**G9929**) · `hub:migration-chat-smoke` (**G9921–G9923**) · `hub:migration-os-close-smoke` (**G8550**) · `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) · [`docs/AI-ASSIST.md`](./AI-ASSIST.md) · [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) · [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) — Default queue (superseded 2026-07-13 by D6424 / G9932–G9939)

**Amended 2026-07-13 (D6423 / G9931) — Angular DI graph depth.**

**Status:** **G9931** closed. Angular inject graph walks relative service edges; multi-origin close includes DI graph. Tier B Vue/Next/Angular structural+CSS+DI polish closed for this program slice. WISP page-hydrate remains paused. LiteRT refused. GenieACS OOS.

When the user says "build" without specifying:

1. **G8550 composite** — `hub:migration-os-close-smoke`
2. **Migration Chat / AI Assist regression** — `hub:migration-chat-smoke`
3. **Multi-origin regression** — `hub:multi-origin-lift-close-smoke` · `hub:angular-di-graph-smoke`
4. **WISP regression only** — admin/ops surface smokes + `wisp:operator-verify -- --require` (no new WISP page-hydrate gates unless asked)

**Closed program regression:** `hub:angular-di-graph-smoke` (**G9931**) · `hub:next-css-depth-smoke` (**G9930**) · `hub:vue-scoped-css-depth-smoke` (**G9929**) · `hub:migration-chat-smoke` (**G9921–G9923**) · `hub:migration-os-close-smoke` (**G8550**) · `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) · [`docs/AI-ASSIST.md`](./AI-ASSIST.md) · [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) · [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) — Default queue (superseded 2026-07-13 by D6423 / G9931)

**Amended 2026-07-13 (D6422 / G9930) — Next App Router CSS depth.**

**Status:** **G9930** closed. Next co-located CSS modules lift without `.next`; multi-origin close includes Next CSS. Prior **G9924–G9929** remain closed regression. WISP page-hydrate remains paused. LiteRT refused. GenieACS OOS.

When the user says "build" without specifying:

1. **Multi-origin polish** — optional Angular DI graph · `hub:multi-origin-lift-close-smoke` · `hub:next-css-depth-smoke`
2. **Migration Chat / AI Assist regression** — `hub:migration-chat-smoke`
3. **G8550 composite** — `hub:migration-os-close-smoke`
4. **WISP regression only** — admin/ops surface smokes + `wisp:operator-verify -- --require` (no new WISP page-hydrate gates unless asked)

**Closed program regression:** `hub:next-css-depth-smoke` (**G9930**) · `hub:vue-scoped-css-depth-smoke` (**G9929**) · `hub:vue-load-bind-smoke` / `hub:next-rsc-depth-smoke` (**G9927–G9928**) · `hub:migration-chat-smoke` (**G9921–G9923**) · `hub:migration-os-close-smoke` (**G8550**) · `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) · [`docs/AI-ASSIST.md`](./AI-ASSIST.md) · [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) · [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) — Default queue (superseded 2026-07-13 by D6422 / G9930)

**Amended 2026-07-12 (D6421 / G9929) — Vue scoped-CSS depth.**

**Status:** **G9929** closed. Vue SFC `<style scoped>` lifts without a Vite dist manifest; multi-origin close includes CSS depth. Prior **G9924–G9928** remain closed regression. WISP page-hydrate remains paused. LiteRT refused. GenieACS OOS.

When the user says "build" without specifying:

1. **Multi-origin polish** — optional Angular DI graph · Next CSS adapter · `hub:multi-origin-lift-close-smoke` · `hub:vue-scoped-css-depth-smoke`
2. **Migration Chat / AI Assist regression** — `hub:migration-chat-smoke`
3. **G8550 composite** — `hub:migration-os-close-smoke`
4. **WISP regression only** — admin/ops surface smokes + `wisp:operator-verify -- --require` (no new WISP page-hydrate gates unless asked)

**Closed program regression:** `hub:vue-scoped-css-depth-smoke` (**G9929**) · `hub:vue-load-bind-smoke` / `hub:next-rsc-depth-smoke` (**G9927–G9928**) · `hub:angular-structural-shell-depth-smoke` (**G9926**) · `hub:migration-chat-smoke` (**G9921–G9923**) · `hub:migration-os-close-smoke` (**G8550**) · `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) · [`docs/AI-ASSIST.md`](./AI-ASSIST.md) · [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) · [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) — Default queue (superseded 2026-07-12 by D6421 / G9929)

**Amended 2026-07-12 (D6420 / G9927–G9928) — Vue load-bind + Next RSC depth.**

**Status:** **G9927–G9928** closed. Shared load-bind hydrates Vue/Next/Angular structural markers; Next async RSC fixture proven. Prior **G9924–G9926** remain closed regression. WISP page-hydrate remains paused. LiteRT refused. GenieACS OOS.

When the user says "build" without specifying:

1. **Multi-origin polish** — Vue scoped-CSS depth · optional Angular DI graph · `hub:multi-origin-lift-close-smoke` · `hub:vue-load-bind-smoke` · `hub:next-rsc-depth-smoke`
2. **Migration Chat / AI Assist regression** — `hub:migration-chat-smoke`
3. **G8550 composite** — `hub:migration-os-close-smoke`
4. **WISP regression only** — admin/ops surface smokes + `wisp:operator-verify -- --require` (no new WISP page-hydrate gates unless asked)

**Closed program regression:** `hub:vue-load-bind-smoke` / `hub:next-rsc-depth-smoke` (**G9927–G9928**) · `hub:angular-structural-shell-depth-smoke` (**G9926**) · `hub:vue-structural-shell-depth-smoke` / `hub:next-structural-shell-depth-smoke` (**G9924–G9925**) · `hub:migration-chat-smoke` (**G9921–G9923**) · `hub:migration-os-close-smoke` (**G8550**) · `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) · [`docs/AI-ASSIST.md`](./AI-ASSIST.md) · [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) · [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) — Default queue (superseded 2026-07-12 by D6420 / G9927–G9928)

**Amended 2026-07-12 (D6419 / G9926) — Angular structural-shell depth.**

**Status:** **G9926** closed (after **G9924–G9925**). Vue/Next/Angular structural-shell emit named holes (template + Angular DI); depth smokes folded into `hub:multi-origin-lift-close-smoke`. WISP page-hydrate remains paused. LiteRT refused. GenieACS OOS.

When the user says "build" without specifying:

1. **Multi-origin depth** — Vue load-bind / Next deeper RSC · optional Tier B polish · `hub:multi-origin-lift-close-smoke` · depth smokes
2. **Migration Chat / AI Assist regression** — `hub:migration-chat-smoke`
3. **G8550 composite** — `hub:migration-os-close-smoke`
4. **WISP regression only** — admin/ops surface smokes + `wisp:operator-verify -- --require` (no new WISP page-hydrate gates unless asked)

**Closed program regression:** `hub:angular-structural-shell-depth-smoke` (**G9926**) · `hub:vue-structural-shell-depth-smoke` / `hub:next-structural-shell-depth-smoke` (**G9924–G9925**) · `hub:migration-chat-smoke` (**G9921–G9923**) · `hub:wisp-cwl-admin-surface-smoke` (**G9917–G9920**) · `hub:migration-os-close-smoke` (**G8550**) · `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) · [`docs/AI-ASSIST.md`](./AI-ASSIST.md) · [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) · [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) — Default queue (superseded 2026-07-12 by D6419 / G9926)

**Amended 2026-07-12 (D6418 / G9924–G9925) — Vue/Next structural-shell depth.**

**Status:** **G9924–G9925** closed. Vue/Next structural-shell emit named holes (no silent strip); depth smokes folded into `hub:multi-origin-lift-close-smoke`. Prior **G9921–G9923** Migration Chat remains closed regression. WISP page-hydrate remains paused. LiteRT refused. GenieACS OOS.

When the user says "build" without specifying:

1. **Multi-origin depth** — Angular DI / service holes · further Vue load-bind / Next RSC depth · `hub:multi-origin-lift-close-smoke` · `hub:vue-structural-shell-depth-smoke` · `hub:next-structural-shell-depth-smoke`
2. **Migration Chat / AI Assist regression** — `hub:migration-chat-smoke`
3. **G8550 composite** — `hub:migration-os-close-smoke`
4. **WISP regression only** — admin/ops surface smokes + `wisp:operator-verify -- --require` (no new WISP page-hydrate gates unless asked)

**Closed program regression:** `hub:vue-structural-shell-depth-smoke` / `hub:next-structural-shell-depth-smoke` (**G9924–G9925**) · `hub:migration-chat-smoke` (**G9921–G9923**) · `hub:wisp-cwl-admin-surface-smoke` (**G9917–G9920**) · `hub:wisp-cwl-ops-surface-smoke` (**G9913–G9916**) · `hub:migration-os-close-smoke` (**G8550**) · `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) · [`docs/AI-ASSIST.md`](./AI-ASSIST.md) · [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) · [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) — Default queue (superseded 2026-07-12 by D6418 / G9924–G9925)

**Amended 2026-07-12 (D6417 / G9921–G9923) — Migration Chat + AI Assist; LiteRT refused.**

**Status:** **G9921–G9923** closed. Interactive/scripted Migration Chat (CLI + hub), AI Assist packaging (`docs/AI-ASSIST.md`, MCP example, `/api/config.aiAssist`). **Refused:** LiteRT.js as convert/runtime substrate. WISP page-hydrate remains paused. GenieACS OOS.

When the user says "build" without specifying:

1. **Migration Chat / AI Assist regression** — `hub:migration-chat-smoke`
2. **Multi-origin / language substrates** — `hub:multi-origin-lift-close-smoke` · Next/Vue/Angular structural smokes (expand origins that lack a WISP-scale POC)
3. **G8550 composite** — `hub:migration-os-close-smoke`
4. **WISP regression only** — admin/ops surface smokes + `wisp:operator-verify -- --require` (no new WISP page-hydrate gates unless asked)

**Closed program regression:** `hub:migration-chat-smoke` (**G9921–G9923**) · `hub:wisp-cwl-admin-surface-smoke` (**G9917–G9920**) · `hub:wisp-cwl-ops-surface-smoke` (**G9913–G9916**) · `hub:migration-os-close-smoke` (**G8550**) · `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/AI-ASSIST.md`](./AI-ASSIST.md) · [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) · [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md) · [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md)

---

## 12 (archived) — Default queue (superseded 2026-07-12 by D6417 / G9921–G9923)

**Amended 2026-07-12 (D6416 / G9917–G9920) — Admin surface closed; WISP page-hydrate grind paused.**

**Status:** **G9917–G9920** closed. Users/tenants/monitoring/HSS/deploy hydrate + catalog/scrub shipped. **Paused:** further WISP empty-module hydrate — diminishing returns without non-WISP language POCs. Prior **G9900–G9916** remain closed regression. GenieACS OOS.

When the user says "build" without specifying:

1. **Multi-origin / language substrates** — `hub:multi-origin-lift-close-smoke` · `hub:next-structural-shell-smoke` · `hub:vue-structural-shell-smoke` · `hub:angular-structural-shell-smoke` (expand origins that lack a WISP-scale POC)
2. **G8550 composite** — `hub:migration-os-close-smoke`
3. **WISP regression only** — `hub:wisp-cwl-admin-surface-smoke` · `hub:wisp-cwl-ops-surface-smoke` · `pnpm run wisp:operator-verify -- --require` (do **not** start new WISP page-hydrate gates unless explicitly requested)
4. **Operator GPU / census** — `gpu-lab:gce` · `hub:extended-matrix-oracle-progress-smoke`

**Closed program regression:** `hub:wisp-cwl-admin-surface-smoke` (**G9917–G9920**) · `hub:wisp-cwl-ops-surface-smoke` (**G9913–G9916**) · `hub:wisp-cwl-route-depth-smoke` (**G9910–G9912**) · `hub:wisp-cwl-all-shells-smoke` (**G9909**) · `hub:migration-os-close-smoke` (**G8550**) · `hub:whole-site-cwl-close-smoke` (**G9450**) · `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) · [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md) · [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md)

---

## 12 (archived) — Default queue (superseded 2026-07-12 by D6416 / G9917–G9920)

**Amended 2026-07-12 (D6415 / G9913–G9916) — Ops/billing showcase surface.**

**Status:** **G9913–G9916** closed. Help-desk/maintain + billing hydrate; residual `svelte:*`/`\r`/mojibake scrub; live `/api/maintain` + `/api/customer-billing` contract. Prior **G9900–G9912** remain closed. GenieACS OOS.

When the user says "build" without specifying:

1. **Ops surface** — `hub:wisp-cwl-ops-surface-smoke` then `pnpm run wisp:deploy:gce`
2. **Route depth** — `hub:wisp-cwl-route-depth-smoke`
3. **All shells** — `hub:wisp-cwl-all-shells-smoke`
4. **Showcase depth** — `hub:wisp-cwl-showcase-depth-smoke`
5. **Island live hydrate** — `hub:wisp-cwl-island-live-hydrate-smoke`
6. **Operator verify** — `pnpm run wisp:operator-verify -- --require`
7. **G8550 / regression** — `hub:migration-os-close-smoke` · `hub:wisp-cwl-visual-depth-smoke` · `hub:multi-origin-lift-close-smoke`

**Closed program regression:** `hub:wisp-cwl-ops-surface-smoke` (**G9913–G9916**) · `hub:wisp-cwl-route-depth-smoke` (**G9910–G9912**) · `hub:wisp-cwl-all-shells-smoke` (**G9909**) · `hub:wisp-cwl-showcase-depth-smoke` (**G9905–G9908**) · `hub:wisp-cwl-markup-artifact-smoke` (**G9904**) · `hub:wisp-cwl-shell-island-smoke` (**G9903**) · `hub:wisp-cwl-island-live-hydrate-smoke` (**G9902**) · `hub:migration-os-close-smoke` (**G8550**) · `hub:whole-site-cwl-close-smoke` (**G9450**)

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) · [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) — Default queue (superseded 2026-07-12 by D6415 / G9913–G9916)

**Amended 2026-07-12 (D6414 / G9910–G9912) — Showcase route depth.**

**Status:** **G9910–G9912** closed. Dashboard module cards from known CWL routes + `/api/admin`; SVG `<//modules/>` scrub; sites → `/api/network` + work-orders structural hydrate. Prior **G9900–G9909** remain closed. GenieACS OOS.

When the user says "build" without specifying:

1. **Route depth** — `hub:wisp-cwl-route-depth-smoke` then `pnpm run wisp:deploy:gce`
2. **All shells** — `hub:wisp-cwl-all-shells-smoke`
3. **Showcase depth** — `hub:wisp-cwl-showcase-depth-smoke`
4. **Island live hydrate** — `hub:wisp-cwl-island-live-hydrate-smoke`
5. **Operator verify** — `pnpm run wisp:operator-verify -- --require`
6. **G8550 / regression** — `hub:migration-os-close-smoke` · `hub:wisp-cwl-visual-depth-smoke` · `hub:multi-origin-lift-close-smoke`

**Closed program regression:** `hub:wisp-cwl-route-depth-smoke` (**G9910–G9912**) · `hub:wisp-cwl-all-shells-smoke` (**G9909**) · `hub:wisp-cwl-showcase-depth-smoke` (**G9905–G9908**) · `hub:wisp-cwl-markup-artifact-smoke` (**G9904**) · `hub:wisp-cwl-shell-island-smoke` (**G9903**) · `hub:wisp-cwl-island-live-hydrate-smoke` (**G9902**) · `hub:migration-os-close-smoke` (**G8550**) · `hub:whole-site-cwl-close-smoke` (**G9450**)

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) · [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) — Default queue (maintenance, superseded 2026-07-12 by D6413 / G9909)

**Amended 2026-07-12 (D6413 / G9909) — Convert all CWL shells at once.**

**Status:** **G9909** closed. All six shell kinds (modal/map/chart/wizard/nav/widget) become honest island chrome in one client pass. Prior **G9900–G9908** remain closed. GenieACS OOS.

When the user says "build" without specifying:

1. **All shells** — `hub:wisp-cwl-all-shells-smoke` then `pnpm run wisp:deploy:gce`
2. **Showcase depth** — `hub:wisp-cwl-showcase-depth-smoke`
3. **Island live hydrate** — `hub:wisp-cwl-island-live-hydrate-smoke`
4. **Operator verify** — `pnpm run wisp:operator-verify -- --require`
5. **G8550 / regression** — `hub:migration-os-close-smoke` · `hub:wisp-cwl-visual-depth-smoke` · `hub:multi-origin-lift-close-smoke`

**Closed program regression:** `hub:wisp-cwl-all-shells-smoke` (**G9909**) · `hub:wisp-cwl-showcase-depth-smoke` (**G9905–G9908**) · `hub:wisp-cwl-markup-artifact-smoke` (**G9904**) · `hub:wisp-cwl-shell-island-smoke` (**G9903**) · `hub:wisp-cwl-island-live-hydrate-smoke` (**G9902**) · `hub:migration-os-close-smoke` (**G8550**) · `hub:whole-site-cwl-close-smoke` (**G9450**)

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) · [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) — Default queue (maintenance, superseded 2026-07-12 by D6405 / G9840)

**Post D6401 close (2026-07-11) — WISP fill-all holes shipped.**

**Status:** **G9800** closed (**D6401**); **G8550** schema **v22**; WISP markup holes **0**; empty `/add` form shells; GenieACS OOS.

When the user says "build" without specifying:

1. **G8550 composite** — `pnpm run hub:migration-os-close-smoke` (schema **v22**)
2. **Operator GPU train** — `pnpm run gpu-lab:gce` with `CHRYSALIS_GPU_LAB_DRY_RUN=0` (T4; LoRA `messages[]` mapping; **G9820** fetch adapter + honest `gpu-lab:gce:status`)
3. **Extended matrix census** — `hub:extended-matrix-oracle-progress-smoke` (**G9160**)
4. **Whole-site CWL regression** — `pnpm run hub:whole-site-cwl-close-smoke` (**G9450**)
5. **WISP regression** — `hub:wisp-fill-holes-smoke` / `hub:wisp-showcase-bound-smoke` (zero-hole bound) + `hub:wisp-cwl-routes-integrity-smoke` (**G9830**); GenieACS never in scope

**Product sample READY:** ≥ **50** live-analytics jobs (`PRODUCT_HIT_RATE_MIN_JOBS`) — may include seed.  
**Live hit-rate READY:** ≥ **50** `hub-convert-verify` jobs (`PRODUCT_HIT_RATE_LIVE_MIN_JOBS`) — via `web-llm:batch-hub-convert-verify-evidence`.  
**Salience v2 production:** auto when `reports/web-llm/operator-evidence/` has ≥ **20** domain folders.  
**Public dashboard:** `/reports/web-llm/operator-evidence/poc/` on the operator hub.

**Closed program regression:** `hub:migration-os-close-smoke` (**G8550** / **D6401**) · `hub:wisp-fill-holes-smoke` (**G9800**) · `hub:wisp-showcase-bound-smoke` (**G9610**) · `hub:product-hit-rate-live-ready-smoke` (**G9770**) · `hub:product-hit-rate-live-smoke` (**G9760**) · `hub:product-hit-rate-sample-smoke` (**G9670**) · `hub:public-reports-smoke` (**G9700**)

**CynoEngine collab:** [`CYNO-CHRYSALIS-COLLAB.md`](./CYNO-CHRYSALIS-COLLAB.md) · strategic plan: [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) · [CynoEngine#1](https://github.com/nimbus7772017/CynoEngine/issues/1)

**Operator demo:** `pnpm run migration-evidence:demo`  
**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

---

## 12 (archived) — Default queue (maintenance, superseded 2026-07-11 by D6401 / G9800)

**Post D6400 close (2026-07-11) — WISP /add form shells + opaque settle shipped.**

**Status:** **G9790** closed (**D6400**); **G8550** schema **v21**; no-source `/add` → empty form shells; residual opaque calls remain intentional; GenieACS OOS.

When the user says "build" without specifying:

1. **G8550 composite** — `pnpm run hub:migration-os-close-smoke` (schema **v21**)
2. **Operator GPU train** — `pnpm run gpu-lab:gce` with `CHRYSALIS_GPU_LAB_DRY_RUN=0` (T4; LoRA `messages[]` mapping)
3. **Extended matrix census** — `hub:extended-matrix-oracle-progress-smoke` (**G9160**)
4. **Whole-site CWL regression** — `pnpm run hub:whole-site-cwl-close-smoke` (**G9450**)
5. **WISP intentional floor** — opaque `reduce`/`filter`/`JSON.stringify`/handlers (no invented business fields); GenieACS never in scope

**Product sample READY:** ≥ **50** live-analytics jobs (`PRODUCT_HIT_RATE_MIN_JOBS`) — may include seed.  
**Live hit-rate READY:** ≥ **50** `hub-convert-verify` jobs (`PRODUCT_HIT_RATE_LIVE_MIN_JOBS`) — via `web-llm:batch-hub-convert-verify-evidence`.  
**Salience v2 production:** auto when `reports/web-llm/operator-evidence/` has ≥ **20** domain folders.  
**Public dashboard:** `/reports/web-llm/operator-evidence/poc/` on the operator hub.

**Closed program regression:** `hub:migration-os-close-smoke` (**G8550** / **D6400**) · `hub:wisp-fill-holes-smoke` (**G9790**) · `hub:wisp-showcase-bound-smoke` (**G9610**) · `hub:product-hit-rate-live-ready-smoke` (**G9770**) · `hub:product-hit-rate-live-smoke` (**G9760**) · `hub:product-hit-rate-sample-smoke` (**G9670**) · `hub:public-reports-smoke` (**G9700**)

**CynoEngine collab:** [`CYNO-CHRYSALIS-COLLAB.md`](./CYNO-CHRYSALIS-COLLAB.md) · strategic plan: [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) · [CynoEngine#1](https://github.com/nimbus7772017/CynoEngine/issues/1)

**Operator demo:** `pnpm run migration-evidence:demo`  
**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

---

## 12 (archived) — Default queue (maintenance, superseded 2026-07-11 by D6400 / G9790)

**Post D6399 close (2026-07-11) — WISP residual settle shipped.**

**Status:** **G9780** closed (**D6399**); **G8550** schema **v20**; residual WISP holes **~517** (39 no-source floor).

When the user says "build" without specifying:

1. **G8550 composite** — `pnpm run hub:migration-os-close-smoke` (schema **v20**)
2. **Operator GPU train** — `pnpm run gpu-lab:gce` with `CHRYSALIS_GPU_LAB_DRY_RUN=0` (T4; LoRA `messages[]` mapping)
3. **Extended matrix census** — `hub:extended-matrix-oracle-progress-smoke` (**G9160**)
4. **Whole-site CWL regression** — `pnpm run hub:whole-site-cwl-close-smoke` (**G9450**)
5. **WISP intentional floor** — opaque calls + **39** no-source `/add` (no invented forms); live production traces when available

**Product sample READY:** ≥ **50** live-analytics jobs (`PRODUCT_HIT_RATE_MIN_JOBS`) — may include seed.  
**Live hit-rate READY:** ≥ **50** `hub-convert-verify` jobs (`PRODUCT_HIT_RATE_LIVE_MIN_JOBS`) — via `web-llm:batch-hub-convert-verify-evidence`.  
**Salience v2 production:** auto when `reports/web-llm/operator-evidence/` has ≥ **20** domain folders.  
**Public dashboard:** `/reports/web-llm/operator-evidence/poc/` on the operator hub.

**Closed program regression:** `hub:migration-os-close-smoke` (**G8550** / **D6399**) · `hub:wisp-fill-holes-smoke` (**G9780**) · `hub:wisp-showcase-bound-smoke` (**G9610**) · `hub:product-hit-rate-live-ready-smoke` (**G9770**) · `hub:product-hit-rate-live-smoke` (**G9760**) · `hub:product-hit-rate-sample-smoke` (**G9670**) · `hub:public-reports-smoke` (**G9700**)

**CynoEngine collab:** [`CYNO-CHRYSALIS-COLLAB.md`](./CYNO-CHRYSALIS-COLLAB.md) · strategic plan: [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) · [CynoEngine#1](https://github.com/nimbus7772017/CynoEngine/issues/1)

**Operator demo:** `pnpm run migration-evidence:demo`  
**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

---

## 12 (archived) — Default queue (maintenance, superseded 2026-07-11 by D6399 / G9780)

**Post D6398 close (2026-07-11) — live hit-rate READY accumulator shipped.**

**Status:** **G9770** closed (**D6398**); **G8550** schema **v19**; residual WISP holes **~564**.

When the user says "build" without specifying:

1. **G8550 composite** — `pnpm run hub:migration-os-close-smoke` (schema **v19**)
2. **Operator GPU train** — `pnpm run gpu-lab:gce` with `CHRYSALIS_GPU_LAB_DRY_RUN=0` (T4; LoRA `messages[]` mapping)
3. **Extended matrix census** — `hub:extended-matrix-oracle-progress-smoke` (**G9160**)
4. **Whole-site CWL regression** — `pnpm run hub:whole-site-cwl-close-smoke` (**G9450**)
5. **WISP residual** — complex calls + 39 no-source `/add` (no invented forms); live production traces when available

**Product sample READY:** ≥ **50** live-analytics jobs (`PRODUCT_HIT_RATE_MIN_JOBS`) — may include seed.  
**Live hit-rate READY:** ≥ **50** `hub-convert-verify` jobs (`PRODUCT_HIT_RATE_LIVE_MIN_JOBS`) — via `web-llm:batch-hub-convert-verify-evidence`.  
**Salience v2 production:** auto when `reports/web-llm/operator-evidence/` has ≥ **20** domain folders.  
**Public dashboard:** `/reports/web-llm/operator-evidence/poc/` on the operator hub.

**Closed program regression:** `hub:migration-os-close-smoke` (**G8550** / **D6398**) · `hub:product-hit-rate-live-ready-smoke` (**G9770**) · `hub:product-hit-rate-live-smoke` (**G9760**) · `hub:wisp-fill-holes-smoke` (**G9750**) · `hub:wisp-showcase-bound-smoke` (**G9610**) · `hub:product-hit-rate-sample-smoke` (**G9670**) · `hub:public-reports-smoke` (**G9700**)

**CynoEngine collab:** [`CYNO-CHRYSALIS-COLLAB.md`](./CYNO-CHRYSALIS-COLLAB.md) · strategic plan: [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) · [CynoEngine#1](https://github.com/nimbus7772017/CynoEngine/issues/1)

**Operator demo:** `pnpm run migration-evidence:demo`  
**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

---

## 12 (archived) — Default queue (maintenance, superseded 2026-07-11 by D6398 / G9770)

**Post D6397 close (2026-07-11) — live hit-rate provenance shipped.**

**Status:** **G9760** closed (**D6397**); **G8550** schema **v18**; residual WISP holes **~564**.

When the user says "build" without specifying:

1. **G8550 composite** — `pnpm run hub:migration-os-close-smoke` (schema **v18**)
2. **Operator GPU train** — `pnpm run gpu-lab:gce` (T4; prep **G9620**; LoRA `messages[]` mapping fixed)
3. **Extended matrix census** — `hub:extended-matrix-oracle-progress-smoke` (**G9160**)
4. **Whole-site CWL regression** — `pnpm run hub:whole-site-cwl-close-smoke` (**G9450**)
5. **WISP residual** — complex calls + 39 no-source `/add` (no invented forms); live production traces when available
6. **Accumulate live verify jobs** — hub-convert verify outcomes toward `productHitRateLiveReady` (≥50)

**Product sample READY:** ≥ **50** live-analytics jobs (`PRODUCT_HIT_RATE_MIN_JOBS`) — may include seed.  
**Live hit-rate READY:** ≥ **50** `hub-convert-verify` jobs (`PRODUCT_HIT_RATE_LIVE_MIN_JOBS`) — seed does not count.  
**Salience v2 production:** auto when `reports/web-llm/operator-evidence/` has ≥ **20** domain folders.  
**Public dashboard:** `/reports/web-llm/operator-evidence/poc/` on the operator hub.

**Closed program regression:** `hub:migration-os-close-smoke` (**G8550** / **D6397**) · `hub:product-hit-rate-live-smoke` (**G9760**) · `hub:wisp-fill-holes-smoke` (**G9750**) · `hub:wisp-showcase-bound-smoke` (**G9610**) · `hub:product-hit-rate-sample-smoke` (**G9670**) · `hub:public-reports-smoke` (**G9700**)

**CynoEngine collab:** [`CYNO-CHRYSALIS-COLLAB.md`](./CYNO-CHRYSALIS-COLLAB.md) · strategic plan: [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) · [CynoEngine#1](https://github.com/nimbus7772017/CynoEngine/issues/1)

**Operator demo:** `pnpm run migration-evidence:demo`  
**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

---

## 12 (archived) — Default queue (maintenance, superseded 2026-07-11 by D6397 / G9760)

**Post D6394 close (2026-07-10) — enriched traces + Object.entries/ternary/$store shipped.**

**Status:** **G9750** closed (**D6394**); **G8550** schema **v17**; residual WISP holes **~564**.

When the user says "build" without specifying:

1. **G8550 composite** — `pnpm run hub:migration-os-close-smoke` (schema **v17**)
2. **Operator GPU train** — `pnpm run gpu-lab:gce` (T4; prep **G9620**)
3. **Extended matrix census** — `hub:extended-matrix-oracle-progress-smoke` (**G9160**)
4. **Whole-site CWL regression** — `pnpm run hub:whole-site-cwl-close-smoke` (**G9450**)
5. **WISP residual** — complex calls + 39 no-source `/add` (no invented forms); live production traces when available
6. **Real operator hit-rate** — replace seeded trajectories with live hub-convert verify outcomes

**Product sample READY:** ≥ **50** live-analytics jobs (`PRODUCT_HIT_RATE_MIN_JOBS`).  
**Salience v2 production:** auto when `reports/web-llm/operator-evidence/` has ≥ **20** domain folders.  
**Public dashboard:** `/reports/web-llm/operator-evidence/poc/` on the operator hub.

**Closed program regression:** `hub:migration-os-close-smoke` (**G8550** / **D6394**) · `hub:wisp-fill-holes-smoke` (**G9750**) · `hub:wisp-showcase-bound-smoke` (**G9610**) · `hub:product-hit-rate-sample-smoke` (**G9670**) · `hub:public-reports-smoke` (**G9700**)

**CynoEngine collab:** [`CYNO-CHRYSALIS-COLLAB.md`](./CYNO-CHRYSALIS-COLLAB.md) · strategic plan: [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) · [CynoEngine#1](https://github.com/nimbus7772017/CynoEngine/issues/1)

**Operator demo:** `pnpm run migration-evidence:demo`  
**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

---

## 12 (archived) — Default queue (maintenance, superseded 2026-07-09 by D6377 / G9560–G9590)

**Post G9510 close (2026-07-09).**

**Status:** **G9510 closed** (**D6372** — IS live analytics); **G9400 closed** (**G9450**, **D6366** — 2026-07-09); Phase 46 closed (**G9290**); UI asset/markup adapters closed (**G9300–G9309**); **Migration OS closed** (**G8550**).

When the user says "build" without specifying:

1. **G8550 composite** — `pnpm run hub:migration-os-close-smoke`
2. **G8570 Open Legacy wedge** — `pnpm run hub:site-port-open-legacy-wedge-smoke`
3. **G6731 CWL language maintenance** — `pnpm run hub:cwl-language-maintenance-smoke` (weekly CI)
4. **Extended matrix census** — `hub:extended-matrix-oracle-progress-smoke` (**G9160**)
5. **Whole-site CWL regression** — `pnpm run hub:whole-site-cwl-close-smoke` (**G9450**)
6. **Structural-shell markup** — `pnpm run hub:ui-markup-lift-smoke` (**G9460** / **D6367**)
7. **Document-shell CSS** — `pnpm run hub:whole-site-cwl-close-smoke` (**G9470** / **D6368**)
8. **WISP whole-site finish** — `pnpm run hub:wisp-whole-site-finish-smoke` (**G9480** / **D6369**; needs WISP root)
9. **WISP remaining holes** — `pnpm run hub:wisp-remaining-holes-finish-smoke` (**G9490** / **D6370**; needs WISP root; GenieACS out of scope)
10. **Fill fillable holes** — `pnpm run hub:wisp-fill-holes-smoke` (**G9500** / **D6371**; needs WISP root)
11. **IS live analytics** — `pnpm run hub:is-live-analytics-close-smoke` (**G9510** / **D6372**)

**Closed program regression:** `hub:whole-site-cwl-close-smoke` (**G9450** / **G9470**) · `hub:ui-markup-lift-smoke` (**G9460**) · `hub:wisp-whole-site-finish-smoke` (**G9480**) · `hub:wisp-remaining-holes-finish-smoke` (**G9490**) · `hub:wisp-fill-holes-smoke` (**G9500**) · `hub:is-live-analytics-close-smoke` (**G9510**) · `hub:phase46-program-close-smoke` (**G9290**) · `hub:phase45-program-close-smoke` (**G9190**)

**WISP showcase:** `hub:phase45-wisp-showcase-smoke` (**G9170**); visual parity `hub:wisp-cwl-ui-parity-close-smoke` (**G8100**) remains showcase-only; finish `hub:wisp-whole-site-finish-smoke` (**G9480**) · `hub:wisp-remaining-holes-finish-smoke` (**G9490**) · `hub:wisp-fill-holes-smoke` (**G9500**)

**Operator demo:** `pnpm run migration-evidence:demo`  
**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

---

## 12 (archived) — Default queue (whole-site CWL conversion — G9400, superseded 2026-07-09 by G9450 close)

**Post G9309 close; G9400 activated 2026-07-09.**

**Status:** **G9400 active** (**D6366**); Phase 46 closed (**G9290**); UI asset/markup adapters closed (**G9300–G9309**). **Proof is last**.

When the user said "build" without specifying:

1. **G9420** — `pnpm run hub:site-convert-smoke`
2. **G9410** — `pnpm run hub:wisp-package-ui-lift-smoke`
3. **G9430** — `pnpm run hub:site-load-bind-smoke`
4. **G9440** — `pnpm run hub:site-scale-matrix-smoke`
5. **G9450** — `pnpm run hub:whole-site-cwl-close-smoke`

**Program doc:** [`docs/WHOLE-SITE-CWL-CONVERSION.md`](./WHOLE-SITE-CWL-CONVERSION.md)

---

## 12 (archived) — Default queue (maintenance, superseded 2026-07-09 by G9400)

**Post Phase 46 close (2026-07-06).**

**Status:** **Phase 46 closed** (**G9290**, **D6343** — 2026-07-06); **Phase 45 closed** (**G9190**); **Migration OS closed** (**G8550**); **G7200** IR helper closed; **WISP showcase in default CI** (**G9170**).

When the user says "build" without specifying:

1. **G8550 composite** — `pnpm run hub:migration-os-close-smoke`
2. **G8570 Open Legacy wedge** — `pnpm run hub:site-port-open-legacy-wedge-smoke`
3. **G6731 CWL language maintenance** — `pnpm run hub:cwl-language-maintenance-smoke` (weekly CI)
4. **Extended matrix census** — `hub:extended-matrix-oracle-progress-smoke` (**G9160**) — **601/601** oracle-product (baseline **0** below target); waves **8–16** (**G9161** / **G9163** / **G9164** / **G9165** / **G9166** / **G9167** / **G9168** / **G9169** / **G9172**)
5. **CWL runtime scaffold depth** — `hub:cwl-runtime-scaffold-depth-smoke` (**G9238**) — browser island binding + worker fetch delegate

**WISP showcase (default CI):** `hub:phase45-wisp-showcase-smoke` (**G9170**)

**Closed program regression:** `hub:phase46-program-close-smoke` (**G9290**) · `hub:phase45-program-close-smoke` (**G9190**) · `hub:phase44-program-close-smoke` (**G9140**) · `hub:ir-helper-program-close-smoke` (**G7200**)

**Operator demo:** `pnpm run migration-evidence:demo`  
**GCE Migration OS:** `pnpm run test:gce:migration-os`  
**GCE maintenance:** `pnpm run test:gce:maintenance`  
**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

---

## 12 (archived) — Default queue (Phase 46 active, superseded 2026-07-06)

> **Historical snapshot** — census counts below are close-time only. Active baseline: **601/601** (**G9160**, **D6357**). See active §12 above.

**Post Phase 45 close; Phase 46 activated 2026-07-06.**

**Status:** **Phase 46 active** (**G9250**, **D6341** — 2026-07-06); **Phase 45 closed** (**G9190**); **Migration OS closed** (**G8550**); **G7200** IR helper closed.

When the user says "build" without specifying:

1. **G9280 build slice** — `pnpm run hub:phase46-build-slice-smoke`
2. **G9275 / G9285** — `hub:extended-matrix-oracle-wave6-smoke` · `hub:extended-matrix-oracle-wave7-smoke`
3. **G9210 runtime depth** — `pnpm run hub:phase46-cwl-runtime-depth-smoke`
4. **G8550 / G8570 maintenance** — after each track merge
5. **G9160 census** — `hub:extended-matrix-oracle-progress-smoke` — **423** pairs below oracle-product (baseline **178/601**)

**WISP showcase (default CI):** `hub:phase45-wisp-showcase-smoke` (**G9170**)

**Closed program regression:** `hub:phase45-program-close-smoke` (**G9190**) · `hub:phase44-program-close-smoke` (**G9140**) · `hub:ir-helper-program-close-smoke` (**G7200**)

**Program close (in progress):** `hub:phase46-program-close-smoke` (**G9290**)

**Operator demo:** `pnpm run migration-evidence:demo`  
**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

---

## 12 (archived) — Default queue (maintenance, superseded 2026-07-06 by Phase 46)

> **Historical snapshot** — census counts below are close-time only. Active baseline: **601/601** (**G9160**, **D6357**). See active §12 above.

**Post Phase 45 close (2026-07-06).**

**Status:** **Phase 45 closed** (**G9190**, **D6340** — 2026-07-06); **Phase 44 closed** (**G9140**); **Migration OS closed** (**G8550**); **G7200** IR helper closed; **WISP showcase in default CI** (**G9170**).

When the user says "build" without specifying:

1. **G8550 composite** — `pnpm run hub:migration-os-close-smoke`
2. **G8570 Open Legacy wedge** — `pnpm run hub:site-port-open-legacy-wedge-smoke`
3. **G6731 CWL language maintenance** — `pnpm run hub:cwl-language-maintenance-smoke`
4. **Extended matrix census** — `hub:extended-matrix-oracle-progress-smoke` (**G9160**) — **423** pairs below oracle-product

**WISP showcase (default CI):** `hub:phase45-wisp-showcase-smoke` (**G9170**)

**Closed program regression:** `hub:phase45-program-close-smoke` (**G9190**) · `hub:phase44-program-close-smoke` (**G9140**) · `hub:ir-helper-program-close-smoke` (**G7200**)

**Operator demo:** `pnpm run migration-evidence:demo`  
**GCE Migration OS:** `pnpm run test:gce:migration-os`  
**GCE maintenance:** `pnpm run test:gce:maintenance`  
**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

---

## 12 (archived) — Default queue (Phase 45 active, superseded 2026-07-06)

**Post Phase 44 close (2026-07-04).**

**Status:** **Phase 44 closed** (**G9140**, **D6311** — 2026-07-04); **Phase 43 closed** (**G8940**, **D6303**); **Phase 41 closed** (**G8790**, **D6301**); **Migration OS closed** (**G8550**); **G6731** subordinate regression.

When the user says "build" without specifying:

1. **G8550 composite** — `pnpm run hub:migration-os-close-smoke` (includes **G8560** + **G8600**)
2. **G8570 Open Legacy wedge** — `pnpm run hub:site-port-open-legacy-wedge-smoke`
3. **G6731 CWL language maintenance** — `pnpm run hub:cwl-language-maintenance-smoke` (subordinate)

**Closed program regression:** `hub:phase44-program-close-smoke` (**G9140**) · `hub:llm-convert-full-close-smoke` (**G8940**) · `hub:full-matrix-oracle-close-smoke` (**G8790**) · `hub:llm-assisted-convert-close-smoke` (**G8830**)

**Operator demo:** `pnpm run migration-evidence:demo`  
**GCE Migration OS:** `pnpm run test:gce:migration-os`  
**GPU lab dry-run:** `pnpm run gpu-lab:gce`  
**VMF hub:** `pnpm run federation:serve`

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) — Default queue (Phase 44 active, superseded 2026-07-04 by maintenance)

**Status:** **Phase 44 active** (**G9000**, **D6310** — 2026-07-04); **Phase 43 closed** (**G8940**, **D6303**); **Phase 41 closed** (**G8790**, **D6301**); **Migration OS closed** (**G8550**); **G6731** subordinate regression.

When the user says "build" without specifying:

1. **G8550 composite** — `pnpm run hub:migration-os-close-smoke` (includes **G8560** + **G8600**)
2. **G8570 Open Legacy wedge** — `pnpm run hub:site-port-open-legacy-wedge-smoke`
3. **G6731 CWL language maintenance** — `pnpm run hub:cwl-language-maintenance-smoke` (subordinate)
4. **Phase 44** — [`PHASE-44-PROGRAM.md`](./PHASE-44-PROGRAM.md): waves **G9010–G9085** → **G9051/G9070** hole closure → **G9110/G9130** Horizon C → **G9121** UI → **G9140** close

**Closed program regression:** `hub:phase44-build-slice-smoke` (in progress) · `hub:llm-convert-full-close-smoke` (**G8940**) · `hub:full-matrix-oracle-close-smoke` (**G8790**) · `hub:llm-assisted-convert-close-smoke` (**G8830**)

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