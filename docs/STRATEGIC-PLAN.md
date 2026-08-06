# Chrysalis â€” Strategic plan (locked)

> **Status:** locked (2026-05-26)  
> **Authority:** This document governs *what to build and in what order*. It does not override `**DESIGN.md`** non-negotiables or `**ROADMAP.md**` mechanics.  
> **Operator stack (what ships today):** [`MIGRATION-OS.md`](./MIGRATION-OS.md)  
> **For AI assistants:** Read `**AGENTS.md`** Â§ â€œStrategic path (locked)â€ before planning or implementing.

---

## 0. How to use this document


| User message sounds like                            | Treat as                                                                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| â€œBuild â€¦â€, â€œImplement â€¦â€, â€œAdd â€¦â€, â€œFix â€¦â€          | Implementation request (still must fit this plan) â€” **true conversion only** (**D6442**/**D6447**)          |
| â€œWhat if â€¦â€, â€œShould we â€¦â€, â€œCan we â€¦â€, â€œExplain â€¦â€ | **Clarification** â€” answer in plan terms; **do not fork** unless user explicitly approves a plan change     |
| â€œAlso do Xâ€ without â€œbuildâ€                         | **Question** â€” is X on-plan or off-plan? Say which phase/workstream it belongs to, or that it is **paused** |
| â€œForget the plan, do Yâ€ / â€œrewrite the plan â€¦â€      | Requires **explicit** plan amendment: `DESIGN.md` Decision Log + edit canon + this file                   |
| â€œDo not add new codeâ€ / â€œonly translateâ€ / â€œstop making things upâ€ / â€œno demo codeâ€ | **D6442**/**D6447** â€” translation / holes / plan docs only; **refuse** faÃ§ades and invented helpers |
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
| **Universal Translator** â€” AI-assisted web conversion through **WebIR + CWL**, with **LLM / Intelligence Shorthand** proposing and **oracle/verify** disposing (**D6437**) | **WISP Module_Manager** â€” optional **showcase lab** only; **not** engine code, not the product name |
| **CWL** â€” consolidated web language (API, Pages, Data, UI, Effects) over WebIR | POC exists solely to evidence surface waves â€” wins must **generalize** into packages / `scripts/lib` |
| Success = language + engine + verify truth + chartered NÃ—N edges | Success on WISP = transferable gate evidence â€” never bake `wisp` into package APIs |

WISP-named scripts under `scripts/` are **legacy/POC**; prefer `scripts/lib/*`. **GenieACS is standalone C (WISPTools legacy) â€” permanently out of Chrysalis scope** (**D6205**, **D6370**).

**Path document:** [`UNIVERSAL-TRANSLATOR-CANON.md`](./UNIVERSAL-TRANSLATOR-CANON.md) (**canon, D6438**) Â· [`UNIVERSAL-TRANSLATOR-PATH.md`](./UNIVERSAL-TRANSLATOR-PATH.md) (historical notes) Â· **Attempt database:** [`initiative-knowledge.v1.json`](./initiative-knowledge.v1.json)

---

## 1. One-sentence strategy

**Ship the AI-assisted Universal Translator:** WebIR + CWL as hub, LLM/IS propose, oracle/verify dispose â€” **translate only**, make the translation work (**D6442**). **Never demo-only code** (**D6447**) â€” true conversion of origin, or an honest hole. **Canon:** [`UNIVERSAL-TRANSLATOR-CANON.md`](./UNIVERSAL-TRANSLATOR-CANON.md) (**D6438** + **D6442**/**D6447** Â§2A). WISP is POC only. **Refuse invention** (Bing/OSM map engines when source is ArcGIS; CDN dialects; net-new chrome; parity faÃ§ades).

---

## 2. What we are building (three layers)


| Layer      | What it is                                                 | Pays bills?             |
| ---------- | ---------------------------------------------------------- | ----------------------- |
| **Engine** | Record â†’ WebIR â†’ emit â†’ verify â†’ chimera                   | Yes (PHP wedge)         |
| **Hub**    | Multi-site migration operations + evidence loop            | Yes (programs at scale) |
| **CWL**    | Canonical text form of WebIR; interchange + RFC absorption | Yes (long-term moat)    |


The **PHP-to-TypeScript converter** is the **adoption vector**. The **framework** (WebIR, runtime, holes, chimera) is the **product**. **CWL** is how we **own the semantic center** over time.

---

## 3. Honest capability tiers (how we talk externally)


| Tier                     | Meaning                                                               | Examples                                                    |
| ------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Oracle product**       | Behavioral capture + ingest + emit + verify on real traces            | PHP â†’ hono / fastify / nextjs / typescript (4 matrix pairs) |
| **Structural plumbing**  | Hole-free lift/emit on toy/literal fixtures; trace replay where gated | Hub gold suites (119+ structural); most matrix pairs        |
| **Scaffold / advisory**  | Route shells, file-lift, planning APIs                                | Pattern-lift origins; path knowledge; migration planner     |
| **Paused (do not sell)** | No oracle + no real-app depth                                         | Vanity matrix pairs without customer route                  |
| **Phase 10 (closed)**    | Production parity reinforcement shipped; maintenance default queue         | See `docs/PRODUCTION-PARITY-PHASE-10.md` (archive)      |


**Rule:** Never imply structural matrix gold equals production migration for that pair.

---

## 4. Three horizons (do not skip)

```text
Horizon 1 (0â€“18 mo)  â€” PHP wedge: oracle + verify + chimera + Laravel/plain depth
Horizon 2 (6â€“15 mo)  â€” Hub as migration OS: evidence dashboard + programs
Horizon 3 (9â€“48 mo)  â€” CWL interchange â†’ authoring; optional runtime last
```

Horizon 2 may overlap Horizon 1; Horizon 3 must not block Horizon 1 delivery.

---

## 5. The usefulness engine (evidence factory)

Closed loop â€” **all product work should strengthen this loop:**

```text
Capture (oracle) â†’ Gap (verify/insight) â†’ Fix (ingest/repair, verify-gated)
  â†’ Re-emit â†’ Re-verify â†’ Update knowledge (path-knowledge, CWL RFC, playbooks)
```

**Hub** is the control plane for this loop, not only SSH + translate.

---

## 6. CWL: what â€œdominate the webâ€ means

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
| **A â€” Spec**      | Now â†’ 12 mo            | Reviewable migration contracts                                                |
| **B â€” Sink**      | 12â€“24 mo               | Every lift exports CWL projection; OpenAPI/HAR â†’ CWL                          |
| **C â€” Authoring** | start now; accelerate  | Greenfield services authored in CWL as soon as ergonomics are viable          |
| **D â€” Runtime**   | start now; phase-gated | Deployable CWL runtime is a first-class target, with emit+verify parity gates |


**Dominance metric:** % of migrated routes with a signed **CWL contract** (+ hole manifest), not GitHub stars.

---

## 7. Phased delivery (authoritative backlog)

### Phase 0 â€” Truth in packaging (weeks) â€” **Closed (2026-06-17)**

- [x] Capability matrix doc â€” **`docs/CAPABILITY-MATRIX.md`** + **`pnpm run hub:capability-matrix`**
- [x] External copy: **PHP oracle migration**, not â€œ575 languagesâ€
- [x] Split **plumbing OK** vs **oracle product OK** in completion/hub reports (**hub-completion** schema + **`docs/CAPABILITY-MATRIX.md`**)

### Phase 1 â€” PHP wedge depth (months 1â€“9) â€” **Closed (2026-06-17)**

- Reinforcement queue **G5740â€“G5773** complete â€” see `docs/PHP-WEDGE-PHASE-1.md`

**Freeze:** New pattern-lift matrix gold unless tied to a **real customer route** or flagship fixture.

### Phase 2 â€” Migration OS (months 6â€“15) â€” **Closed (2026-06-17)**

- Reinforcement queue **G5780â€“G5823** complete â€” see `docs/MIGRATION-OS-PHASE-2.md`

**Deliverable:** Export **migration contract** per project (`routes.cwl` + hole manifest).

### Phase 3 â€” CWL interchange + authoring bootstrap (months 9â€“24) â€” **Closed (2026-06-17)**

- Reinforcement queue **G5830â€“G5873** complete â€” see `docs/CWL-INTERCHANGE-PHASE-3.md`

### Phase 4 â€” Second oracle origin (months 12â€“24) â€” **Closed (2026-06-17)**

- Reinforcement queue **G5880â€“G5923** complete â€” see `docs/SECOND-ORACLE-ORIGIN-PHASE-4.md`

### Phase 5 â€” CWL runtime (accelerated) â€” **Closed (2026-06-17)**

- Reinforcement queue **G5930â€“G5963** complete â€” see `docs/CWL-RUNTIME-PHASE-5.md`

### Phase 6 â€” CWL runtime at scale (24â€“48 mo) â€” **Closed (2026-06-17)**

- Reinforcement queue **G5970â€“G6003** complete â€” see `docs/CWL-RUNTIME-SCALE-PHASE-6.md`

### Phase 7 â€” Full-stack CWL surface (parallel track) â€” **Closed (2026-06-17)**

- Reinforcement queue **G6010â€“G6043** complete â€” see `docs/CWL-FULLSTACK-PHASE-7.md`

### Phase 8 â€” Product proof (strict reinforcement) â€” **Closed (2026-06-18)**

- Reinforcement queue **G6050â€“G6113** complete â€” see `docs/PRODUCT-PROOF-PHASE-8.md`
- **Strict path:** `pnpm run test:gce:phase8-strict` (GCE); passed **2026-06-18**
- **Local fast path:** same smokes with explicit skip opts (Vitest default)

### Phase 9 â€” Operational hardening â€” **Closed (2026-06-18)**

- Reinforcement queue **G6120â€“G6153** complete â€” see `docs/OPERATIONAL-HARDENING-PHASE-9.md`
- Hub-completion schema **512** + `phase8ProductProof` section
- Capability matrix schema **34** + `strategicPlanPhase8ProductProof`

**Strategic plan phases 0â€“10:** all reinforcement queues **closed** (**G5680â€“G6257**).

### Phase 10 â€” Production parity â€” **Closed (2026-06-19)**

- Reinforcement queue **G6200â€“G6253** complete â€” see `docs/PRODUCTION-PARITY-PHASE-10.md`
- Program archive close **G6254â€“G6257** â€” maintenance default queue restored
- **Runtime Phase C** remains **active** (session/SQL verify gates; not reverted to stub-only claims)
- Hub-completion schema **513** + `phase10ProductionParity` (depth schema **8**)

**Strategic plan phases 0â€“10:** all reinforcement queues **closed** (**G5680â€“G6257**).

**Default build queue:** **CWL universal web language program active** (**G7300**, **D6260**) â€” Phase **19 â†’ 23**; subordinate **G7200** + **G7150** regression. See [`CWL-UNIVERSAL-LANGUAGE-PROGRAM.md`](./CWL-UNIVERSAL-LANGUAGE-PROGRAM.md).

### Phase 15 â€” CWL UI v0 (**closed G7110**)

- **Authority:** **DESIGN D6207â€“D6208** â€” RFC-0017 + RFC-0018 (`@component`); [`CWL-UI-LOGIN-BRIDGE.md`](./CWL-UI-LOGIN-BRIDGE.md) for WISP `/login`
- **Close G7110:** `pnpm run hub:cwl-phase15-close-smoke`
- **Smoke G7111:** `pnpm run hub:cwl-ui-v0-smoke`

### Phase 16 â€” CWL Data complete (**closed G7120**)

- **Authority:** RFC-0013 â€” native `load { }` on flagship + WISP charter
- **Close G7120:** `pnpm run hub:cwl-data-complete-smoke`

### Phase 17 â€” CWL Effects executable (**closed G7130**)

- **Authority:** RFC-0007 â€” `wrapCwlExecutableEffects` lowers `session.read` / `session.write` to effect-dialect nodes
- **Close G7130:** `pnpm run hub:cwl-effects-executable-smoke`

### Phase 18 â€” Cutover and greenfield (**closed G7140**)

- **Authority:** [`CWL-SURFACE-TAXONOMY.md`](./CWL-SURFACE-TAXONOMY.md) ladder **step 5** â€” single firebase login hole on WISP
- **Close G7140:** `pnpm run hub:cwl-cutover-smoke`

### CWL complete language close (**closed G7150**)

- **Win:** Phases **15â€“18** + **G6731** maintenance composite green
- **Smoke:** `pnpm run hub:cwl-complete-language-close-smoke`
- **Regression:** Phase 13â€“14 WISP smokes optional (**D6259**)

---

### Phase 19 â€” CWL UI v1 (**closed G7310**)

- **Authority:** **DESIGN D6260** â€” [`CWL-UNIVERSAL-LANGUAGE-PROGRAM.md`](./CWL-UNIVERSAL-LANGUAGE-PROGRAM.md); RFC-0019 (UI v1: islands, hydration policy)
- **Close G7310:** `pnpm run hub:cwl-phase19-close-smoke`

### Phase 20 â€” CWL Data v2 (**closed G7320**)

- **Authority:** RFC-0013 v2 â€” parallel loads, redirects, errors; SvelteKit/Next server ingest
- **Close G7320:** `pnpm run hub:cwl-phase20-close-smoke`

### Phase 21 â€” CWL Effects middleware (**closed G7330**)

- **Authority:** RFC-0020 â€” executable effect chains beyond session (authz, CSRF, CORS)
- **Close G7330:** `pnpm run hub:cwl-phase21-close-smoke`

### Phase 22 â€” Universal ingest (**closed G7340**)

- **Authority:** Multi-origin ingest at pilot scale â€” PHP + SvelteKit/Next/OpenAPI â†’ CWL default output
- **Close G7340:** `pnpm run hub:cwl-phase22-close-smoke`

### Phase 23 â€” Greenfield cutover template (**closed G7350**)

- **Authority:** Ladder step 5 for **new apps** â€” CWL-only module, no chimera for app logic
- **Close G7350:** `pnpm run hub:cwl-phase23-close-smoke`

### CWL universal web language close (**closed G7390**)

- **Win:** Phases **19â€“23** + **G7150** + **G7200** regression composite green
- **Smoke:** `pnpm run hub:cwl-universal-language-close-smoke`
- **Program doc:** [`CWL-UNIVERSAL-LANGUAGE-PROGRAM.md`](./CWL-UNIVERSAL-LANGUAGE-PROGRAM.md)

---

### Phase 24 â€” Customer pilot at scale (**closed G7490**)

- **Authority:** **DESIGN D6262** / **D6263** â€” [`CWL-CUSTOMER-PILOT-PROGRAM.md`](./CWL-CUSTOMER-PILOT-PROGRAM.md)
- **Program close G7490:** `pnpm run hub:cwl-customer-pilot-close-smoke`

---

### Phase 25 â€” Fully complete web language (**closed G7590**)

- **Authority:** **DESIGN D6264** / **D6265** / **D6266** â€” [`CWL-FULL-WEB-LANGUAGE-PROGRAM.md`](./CWL-FULL-WEB-LANGUAGE-PROGRAM.md); [`CWL-UNIVERSAL-TRANSLATOR-PARITY.md`](./CWL-UNIVERSAL-TRANSLATOR-PARITY.md)
- **Requires:** **G7490** closed
- **Close verify:** `pnpm run hub:cwl-full-web-language-close-smoke` (**G7590**)

---

**Amended 2026-06-24 (WISP full site CWL â€” D6268):** Phase **27** active after **G7690**: CWL must **replace any website** web tier; **WISP** is first proof â€” native API, UI depth, auth, cutover; program close **G7790**. See [`WISP-FULL-SITE-CWL-PROGRAM.md`](./WISP-FULL-SITE-CWL-PROGRAM.md).

---

**Amended 2026-06-25 (WISP full site closed â€” D6269):** Phase **27** closed at **G7790**: WISP Module_Manager first full-site CWL proof; default maintenance **G7790** composite. See [`WISP-FULL-SITE-CWL-PROGRAM.md`](./WISP-FULL-SITE-CWL-PROGRAM.md).

### Phase 27 â€” WISP full site CWL replacement (**closed G7790**)

- **Authority:** **DESIGN D6268** â€” [`WISP-FULL-SITE-CWL-PROGRAM.md`](./WISP-FULL-SITE-CWL-PROGRAM.md)
- **Requires:** **G7690** closed
- **Charter:** `fixtures/hub-wisp-full-site-slice/chrysalis.wisp-full-site.v1.json`
- **Phase 27a â€” Charter:** **G7701** `pnpm run hub:wisp-phase27a-close-smoke`
- **Phase 27b â€” CWL API native:** **G7702** `pnpm run hub:wisp-phase27b-close-smoke`
- **Phase 27c â€” CWL UI depth:** **G7703** `pnpm run hub:wisp-phase27c-close-smoke`
- **Phase 27d â€” Auth + session:** **G7704** `pnpm run hub:wisp-phase27d-close-smoke`
- **Phase 27e â€” Integrations:** **G7705** `pnpm run hub:wisp-phase27e-close-smoke`
- **Phase 27f â€” Cutover:** **G7706** `pnpm run hub:wisp-phase27f-close-smoke`
- **Program close G7790:** `pnpm run hub:wisp-full-site-close-smoke`
- **Entry G7700:** `pnpm run hub:wisp-full-site-program-entry-smoke`

---

### Phase 26 â€” Universal translator NÃ—N through CWL (**closed G7690**)

- **Authority:** **DESIGN D6267** â€” [`CWL-UNIVERSAL-TRANSLATOR-PROGRAM.md`](./CWL-UNIVERSAL-TRANSLATOR-PROGRAM.md)
- **Requires:** **G7590** closed
- **Charter:** `fixtures/hub-universal-translator-slice/chrysalis.translator-composer.v1.json`
- **Close verify:** `pnpm run hub:cwl-universal-translator-close-smoke` (**G7690**)

---

### Phase 12 â€” WISP CWL flagship (Phase 0 closed)

- **Queue G6300â€“G6310 closed** â€” see [`docs/WISP-CWL-FULLSTACK-PROGRAM.md`](./WISP-CWL-FULLSTACK-PROGRAM.md)
- **Close verify:** `pnpm run hub:wisp-cwl-phase12-phase0-close-smoke` (**G6310**)
- **Topology:** [`docs/WISP-CWL-FULLSTACK-PROGRAM.md`](./WISP-CWL-FULLSTACK-PROGRAM.md) (Topology and deploy)

### Phase 13 â€” CWL surface waves (**closed G6410**)

- **Authority:** **DESIGN D6193** â€” [`docs/CWL-SURFACE-TAXONOMY.md`](./CWL-SURFACE-TAXONOMY.md)
- **Gate G6340:** `pnpm run hub:cwl-surface-taxonomy-smoke`
- **Close G6410:** `pnpm run hub:wisp-cwl-phase13-close-smoke`
- **Program:** WISP module waves M0â€“M6 closed **CWL API â†’ Pages â†’ Data â†’ UI â†’ Effects** per [`WISP-CWL-FULLSTACK-PROGRAM.md`](./WISP-CWL-FULLSTACK-PROGRAM.md)
- **Refuse:** sidecar bridges without holes; â€œfull replacementâ€ claims while `hub-svelte:page-component` remains

### Phase 14 â€” WISP HSS operator deploy (**closed G6690**)

- **Authority:** **DESIGN D6204**, **D6205** â€” [`WISP-CWL-FULLSTACK-PROGRAM.md`](./WISP-CWL-FULLSTACK-PROGRAM.md) Â§ Phase 14
- **Close G6690:** `pnpm run hub:wisp-cwl-phase14-program-close-smoke`
- **Operator regression G6590:** `pnpm run hub:wisp-cwl-phase14-close-smoke`
- **Refuse:** **GenieACS is WISPTools legacy â€” not Chrysalis POC scope** (**D6205**); no CWL RFCs, runtime special cases, or verify gates for GenieACS/ACS
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
| **P1**   | Phase 10: production SQL/session, WordPress entry, matrix expansion             | 575Ã—26 marketing matrix                           |
| **P2**   | Second oracle origin                                                          | Rust/Kotlin oracle before Node/Python flagship    |
| **P2**   | WordPress vertical (Phase 10 entry)                                           | Many literal-only gold suites                     |


---

## 9. Knowledge base (make actionable)

Path knowledge + web DB catalog + synthesis â†’ **playbooks**:

- Pair advice tied to **verify divergence codes**
- Effort / hole forecasts per origin
- DB catalog â†’ emit hints (ORM/SQL layer)
- CWL RFC backlog ranked by **corpus frequency**, not excitement

---

## 10. Business shape (alignment)

1. **Assessment** â€” scan + small capture + readiness report
2. **Pilot** â€” fixed route slice, verify threshold
3. **Program** â€” Hub batch, correctness SLA, chimera support
4. **Platform license** â€” CLI + Hub + oracle (not per-language SKUs)

---

## 11. Explicit non-goals (even if requested casually)

Without plan amendment, treat these as **out of scope**:

- Chasing full **575Ã—26 production** migration parity for marketing  
- Claiming production-ready CWL runtime without parity evidence (verify + contract coverage)  
- Promising **any web app, any language** without second-oracle flagship evidence  
- LLM repair that bypasses verify  
- Rebranding structural-only matrix depth as full-stack oracle parity

**Amended 2026-06-19 (Phase 11):** Honest gaps implementation (**G6280â€“G6290**) â€” WordPress customer sample oracle, north-star metrics automation, commercial launch verify, IR helper B6, WPTP D7 harness. See `docs/HONEST-GAPS-PHASE-11.md`.

**Amended 2026-06-19 (Phase 12):** WISP Module_Manager full CWL flagship (**G6300â€“G6310**) â€” local GCE two-VM stack, scenario inventory, API proxy CWL, chimera gateway. See `docs/WISP-CWL-FULLSTACK-PROGRAM.md`.

**Amended 2026-06-19 (Phase 13 â€” CWL surfaces):** Formal **CWL surface taxonomy** (**D6193**, **G6340**): CWL API / Pages / Data / UI / Effects as named layers of one web language; Phase 13 closes surfaces on WISP module waves. See `docs/CWL-SURFACE-TAXONOMY.md`.

**Amended 2026-06-19 (Phase 14 â€” HSS operator):** **DESIGN D6204** â€” HSS chimera deploy to operator backend. **GenieACS is WISPTools legacy â€” not Chrysalis POC scope** (**D6205**).

---

**Amended 2026-06-22 (Phase 15â€“18 â€” D6206):** **CWL complete web language** is the active product path after **G6750**. Phases **15 (UI) â†’ 16 (Data) â†’ 17 (Effects) â†’ 18 (cutover)**; close **G7150**. IR helper maintenance (**G6731**) is subordinate. See [`CWL-LANGUAGE-PROGRAM.md`](./CWL-LANGUAGE-PROGRAM.md).

**Amended 2026-06-19 (Phase 14 close â€” G6690):** HSS operator deploy program archived; operator regression via **G6590** / **G6690**.

**Amended 2026-06-19 (POC vs language â€” D6205):** **CWL is authoritative.** WISP **exists solely to showcase the language** â€” not to define it. GenieACS removed from Chrysalis consideration (WISPTools original design only).

**Amended 2026-07-14 (D6442 â€” translate-only fidelity law).** Reset after ArcGIS map dialectic / invented loaders. **Only translate** source â†’ WebIR/CWL â†’ emit; preserve ArcGIS as ArcGIS (not Bing/OSM invents); holes over substitutes; no new invented code when ordered translate-only. Canon Â§2A. Extends **D6441** vendor islands.

**Amended 2026-07-14 (D6441 â€” vendor islands preserved).** Third-party SDK add-ins (`@arcgis/core`, charts, Firebase client, etc.) stay as **source client islands**: same package + origin toolchain (e.g. Module_Manager Vite). CWL owns shell/contracts/holes â€” **do not rewrite** vendors to CDN AMD/ESM or alternate bundler dialects. See DESIGN **D6441** / **D6442**; WISP hole `hub-svelte:arcgis-map`.

**Amended 2026-06-16 (WISP POC decoupled â€” D6259):** WISP Module_Manager showcase **decoupled from default CI/build**. Smokes, scripts, and optional weekly **`wisp-poc-regression`** workflow remain for operator demo refresh; default queue is **G7200 + G7150** only.

**Amended 2026-06-16 (CWL universal web language â€” D6260):** Phases **19â€“23** active locked path after **G7150**: **UI v1 â†’ Data v2 â†’ Effects middleware â†’ Universal ingest â†’ Greenfield cutover**; program close **G7390**. See [`CWL-UNIVERSAL-LANGUAGE-PROGRAM.md`](./CWL-UNIVERSAL-LANGUAGE-PROGRAM.md).

---

**Amended 2026-06-24 (CWL customer pilot â€” D6262):** Phase **24** active locked path after **G7390**: **charter â†’ ingest â†’ verify â†’ cutover**; program close **G7490**. See [`CWL-CUSTOMER-PILOT-PROGRAM.md`](./CWL-CUSTOMER-PILOT-PROGRAM.md).

---

**Amended 2026-06-24 (CWL customer pilot closed â€” D6263):** Phase **24** shipped; program close **G7490**. Default queue â†’ **G7490** regression. See [`CWL-CUSTOMER-PILOT-PROGRAM.md`](./CWL-CUSTOMER-PILOT-PROGRAM.md).

---

**Amended 2026-06-24 (Fully complete web language â€” D6264 / D6265):** Phase **25** active locked path after **G7490**: **charter â†’ CWL 100% â†’ translator parity â†’ translator verify**; universal translator must meet **CWL-equivalent** evidence; program close **G7590**. See [`CWL-FULL-WEB-LANGUAGE-PROGRAM.md`](./CWL-FULL-WEB-LANGUAGE-PROGRAM.md).

**Amended 2026-06-24 (Phase 25 program close â€” D6266):** **G7590** closed â€” fully complete web language + universal translator at CWL parity; default queue is **G7590 regression** + maintenance.

**Amended 2026-06-24 (Universal translator NÃ—N closed â€” D6267):** Phase **26** closed at **G7690**: composer charter, CWL outbound, mandatory roundtrip, cross-edges green; default maintenance **G7690** composite. See [`CWL-UNIVERSAL-TRANSLATOR-PROGRAM.md`](./CWL-UNIVERSAL-TRANSLATOR-PROGRAM.md).

**Amended 2026-06-27 (WISP production POC closed â€” D6271):** Phase **28** closed at **G7890**: operator contracts, post-G7790 pipeline, integration client UI, oracle trace pilot replay green (**G7805**); default maintenance **G7890** composite. See [`WISP-PRODUCTION-POC-PROGRAM.md`](./WISP-PRODUCTION-POC-PROGRAM.md).

**Amended 2026-06-27 (WISP production completion closed â€” D6272):** Phase **29** closed at **G7990**: full API oracle corpus (**109** routes, **G7905**), CWL static export (**87** pages, **G7904**), operator contract smoke (**G7906**); default maintenance **G7990** composite. See [`WISP-PRODUCTION-COMPLETION-PROGRAM.md`](./WISP-PRODUCTION-COMPLETION-PROGRAM.md).

**Amended 2026-06-16 (WISP CWL UI parity â€” D6274):** Phase **31** active after **G7990**: bulk Svelte lift, anchor parity (login/dashboard/plan/deploy/map), forbidden-stub crawler + chimera HTTP probes; program close **G8100**. See [`WISP-CWL-UI-PARITY-PROGRAM.md`](./WISP-CWL-UI-PARITY-PROGRAM.md).

**Amended 2026-06-26 (WISP production POC â€” D6270):** Phase **28** active after **G7790**: operator HTTP contracts, post-G7790 pipeline, integration client UI, honest oracle trace pilot; program close **G7890**. See [`WISP-PRODUCTION-POC-PROGRAM.md`](./WISP-PRODUCTION-POC-PROGRAM.md).

**Amended 2026-07-03 (Phase 42 LLM-assisted convert â€” D6302):** Phase **42** closed at **G8830**: bounded verify-gated LLM propose layer on convert workflows â€” **not** a bypass around WebIR/ingest/emit/oracle. Subordinate to **G8550** maintenance. See [`LLM-ASSISTED-CONVERT-PROGRAM.md`](./LLM-ASSISTED-CONVERT-PROGRAM.md).

---

**Amended 2026-07-06 (Phase 46 close â€” D6343):** Phase **46** **closed** at **G9290**: waves **6â€“7** (**180/601** oracle-product), CWL runtime deploy (**G9240**); default queue returns to **G8550** maintenance. See [`PHASE-46-PROGRAM.md`](./PHASE-46-PROGRAM.md).

**Amended 2026-07-06 (Phase 46 â€” D6341):** Phase **46** **active** at **G9250**: matrix waves **6â€“7** + **CWL runtime depth** (browser/worker scaffolds, emit-runtime-cwl); requires **G9190** closed. See [`PHASE-46-PROGRAM.md`](./PHASE-46-PROGRAM.md).

**Amended 2026-07-06 (Phase 45 close â€” D6340):** Phase **45** **closed** at **G9190**: waves **4â€“5** (**178/601** oracle-product), WISP showcase default CI preserved; default queue returns to **G8550** maintenance. See [`PHASE-45-PROGRAM.md`](./PHASE-45-PROGRAM.md).

**Amended 2026-07-06 (Phase 45 CWL product supremacy â€” D6336):** Phase **45** **active** at **G9150**: default build prioritizes **CWL product evidence** â€” extended matrix wave maintenance, **WISP showcase in default CI** (supersedes **D6259** default-build bar), IR helper/CWL language first-class. See [`PHASE-45-PROGRAM.md`](./PHASE-45-PROGRAM.md).

**Amended 2026-07-04 (Phase 44 close â€” D6311):** Phase **44** **closed** at **G9140**: extended matrix waves 1â€“3 (**169/601** oracle-product), LLM hole-closure â†’ repair bridge, Horizon C operator train contract â€” honest partial census, not 601-pair production parity. See [`PHASE-44-PROGRAM.md`](./PHASE-44-PROGRAM.md).

**Amended 2026-07-04 (Phase 44 â€” D6310):** Phase **44** active at **G9000**: extended hub matrix oracle waves (601-pair census), LLM hole-closure â†’ repair bridge, in-repo Horizon C QLoRA train loop (operator GPU). See [`PHASE-44-PROGRAM.md`](./PHASE-44-PROGRAM.md).

**Amended 2026-07-03 (Phase 43 LLM convert full â€” D6303):** Phase **43** **closed** at **G8940**: LLM/stub hole enrichment, verify-gated operator apply, repair bridge, MCP **`hub_convert_apply_holes`** â€” extends closed Phase 42 without bypassing WebIR/oracle. See [`LLM-CONVERT-FULL-PROGRAM.md`](./LLM-CONVERT-FULL-PROGRAM.md).

## 12. Default queue (active)

**Amended 2026-08-05 (D6552 / G10126) — Convert consumes CWL↔Helix cutover.** `hub:cwl-helix-cutover-smoke` prefers pillar `smoke:ut-evidence --require-helix` (spine + ingest matrix) when present; else `smoke:ut-spine`. Companion: `hub:cwl-ingest-matrix-smoke`, `hub:cwl-pin-smoke`, `hub:webir-resolve-smoke`. Honest SKIP without siblings. Chimera+Helix playbook in Secure. Does not reopen EXTFMAP; WebIR flip still deferred (link-until-pnpm).

**Amended 2026-08-05 (D6551) — Core vs peel charter.** Governing question is not “TS vs Rust?” but **what may live outside typed WebIR/CWL core**. Hub smokes/peels/oracles stay peel by default; WebIR + CWL grammar + hole/verify contracts are core. Doc: [`CORE-VS-PEEL.md`](./CORE-VS-PEEL.md). Forced next: WebIR substrate flip (Slice 3 / link-until-pnpm), not a peel rewrite. Dual primary (**D6540**) and UT↔Helix spine (**D6550**) unchanged.

**Amended 2026-08-05 (D6550 / G10125) — UT ↔ Helix spine owned by CWL (not Convert).** Language cutover prove is `chrysalis-cwl` `npm run smoke:ut-spine` (+ Secure `cutover-smoke`). Convert Pilot Kit stays laravel/cobol only — do not re-home DNA/surface spine here. Umbrella: [`AgenticOps/docs/UT-CONVERT-SECURE-SPINE.md`](../../docs/UT-CONVERT-SECURE-SPINE.md). EXTFMAP still sole COBOL P0; WebIR flip deferred (link-until-pnpm).

**Amended 2026-08-04 (D6549 / G10124) — COPY … REPLACING layout inventory.** `parseCobolCopyReplacing` → hole attrs; labeled fixtures `hub-cobol-layout-copy-replacing`; best-fit `webir-hole-attrs-copy-replacing` (does not reopen G10106). Not INITIALIZE/INSPECT REPLACING; no copy-expansion invent; EXTFMAP still sole P0. CWL bridge WebIR subset widened with new language-gold dirs.

**Amended 2026-08-05 (D6548) — cwl-fmt dual-mode locked.** Pillar parse→print vs convert WebIR fmt — [`CWL-FMT-DUAL-MODE.md`](./CWL-FMT-DUAL-MODE.md). DNA enforce / cutover identity compare → Secure; Convert consumes RFC-0022 surface only.

**Amended 2026-08-04 (D6548 / G10123) — CWL language pillar bootstrap (core check).** Always check CWL before Convert deepen: `engines/chrysalis-cwl` ships `LANGUAGE_VERSION.md` + golden `.cwl` fixtures; Convert gate `hub:cwl-language-pillar-smoke` proves parse→print; `hub:cwl-above-code-smoke` requires pillar green. Dual primary (**D6540**) continues; CWL is SoR for language maturity (not every peel is a CWL RFC).

**Amended 2026-08-03 (D6544 / G10119) — Tapir Scala secondary unparked.** Was G10057 skip. Now `hub-gold-tapir` + `hub:tapir-smoke` (20/20): peel `endpoint.VERB.in` + `serverLogicSuccess` Map/lit — no jsonBody/plainBody invent. Akka ST; Http4s + Finch green. Convert apply wires dispose certificate. Catalog: [`fixtures/ci/tapir-honest-skip.json`](../fixtures/ci/tapir-honest-skip.json) (`closed-route-surface`).

**Amended 2026-08-03 (D6545 / G10120) — Public COBOL mega-corpus census.** Off-repo clones under `CHRYSALIS_COBOL_CORPORA_ROOT` + registry/census (`hub:cobol-corpus-census`). Maps commercial 8-phase corpus advice to Chrysalis honesty — **does not** close `copy:EXTFMAP`. Doc: [`docs/COBOL-EXTERNAL-PROVE-CORPORA.md`](./COBOL-EXTERNAL-PROVE-CORPORA.md).

**Amended 2026-08-03 (D6546 / G10121) — OCCURS DEPENDING ON layout inventory.** `parseCobolOccursDepending` → `inventoryCobolSource` / hole attrs; JRecord labeled fixtures; best-fit `webir-hole-attrs-occurs-depending` (does not reopen G10106 exhaust).

**Amended 2026-08-03 (D6547 / G10122) — Level-66 RENAMES layout inventory.** `parseCobolRenames` → hole attrs; copybook-rs labeled fixtures; best-fit `webir-hole-attrs-renames`.

**Amended 2026-08-03 (D6543 / G10118) — Deno.serve pathname+method unparked.** Was G10060 / D6522 skip. Now `hub-gold-deno-serve` + `hub:deno-serve-smoke` (20/20): peel `Deno.serve` via CF Workers method+pathname reuse — no invented `{ routes }`. Oak / Bun.serve / itty / CF Workers stay green. Catalog: [`fixtures/ci/deno-serve-honest-skip.json`](../fixtures/ci/deno-serve-honest-skip.json) (`closed-route-surface`).

**Amended 2026-08-03 (D6542 / G10117) — Drogon C++ secondary unparked.** Was G10058 skip. Now `hub-gold-drogon` + `hub:drogon-smoke` (20/20): peel `app().registerHandler` + Json::Value / newHttpJsonResponse / setBody / setStatusCode(k*) / getParameter / `{id}` lambda args. Crow remains C++ D6448-ST; cpp-httplib stays green. METHOD_ADD / filters = honest holes. Catalog: [`fixtures/ci/drogon-honest-skip.json`](../fixtures/ci/drogon-honest-skip.json) (`closed-route-surface`).

**Amended 2026-08-03 (D6541 / G10116) — Agent-era substrate (Hole Type System + CWL-Above-Code + Dispose Plane entry).** Operator bet pack on ownership after lift. Dual primary (**D6540**) remains **ingress**; these bets define **SoR + honesty + agent dispose**. Gates: `hub:hole-type-system-smoke` · `hub:cwl-above-code-smoke` · `hub:dispose-plane-smoke` · composite `hub:agent-era-substrate-smoke`. Program: [`AGENT-ERA-SUBSTRATE.md`](./AGENT-ERA-SUBSTRATE.md). Deferred: World-from-Traffic / Parity Bonds / FDE weld (cross-lane charter only).

**Amended 2026-08-03 (D6540 / G10114) — Dual primary: COBOL ∥ multi-language deepen.** Operator unparked secondary-dialect / previously skipped frameworks. Default build is **either**:
1. **COBOL primary** — residual / EXTFMAP / chartered z/OS path (`COBOL-NO-ZOS-CEILING.md`), **or**
2. **Language deepen** — bring parked / honest-skipped dialects toward **route-surface parity with COBOL leadership** (gold 20/20 + residual honesty), **without inventing** LiveView / Rails controllers / Nest DI / NancyHost / Revel façades (**D6442** / **D6447**).

Prefer peelable previously skipped frameworks first (Nancy FX · Revel `conf/routes` table · Rails routes.rb table · **Drogon closed G10117**) over inventing middleware onions. Scoreboard: [`LEADERSHIP-SCOREBOARD.md`](./LEADERSHIP-SCOREBOARD.md).

**Amended 2026-07-27 (D6538 / G10077) — Tier A+ COBOL-primary queue hygiene.** *(Superseded as sole default by **D6540** — COBOL remains one of two primaries.)* Secondary-dialect bingo was paused; **D6540** is the operator reopen for language deepen.

**Amended 2026-07-15 (D6444) â€” Origin source corpus + piecemeal convert.** See canon Â§2C. Ingest all origin files â†’ code DB â†’ convert queue; background/API pieces are first-class.

**Amended 2026-07-15 (D6443) â€” Source-authoritative UI conversion.** See canon Â§2B. Origin CSS + class names + vendor islands are look/behavior authority; no overlay redefine.

**Amended 2026-07-17 (D6448) â€” Complete conversion protocol.** See [`COMPLETE-CONVERSION-PROTOCOL.md`](./COMPLETE-CONVERSION-PROTOCOL.md) and canon Â§2D. Convert must close holes during convert (honest loop) until zero or fail incomplete â€” all languages.

**Amended 2026-07-17 (D6447) â€” True conversion only; never demo-only code (all languages).** See canon Â§0/Â§2A and `AGENTS.md` absolute law. Applies to every originâ†’emit pair â€” WISP is POC proof only. Agents: lift origin or emit honest holes â€” **refuse** hand-built showcase pages, non-lifted parity shells, force-settled â€œgreenâ€ holes. After convert: sign in and test against origin.

**Amended 2026-07-14 (D6442) â€” Translate-only fidelity law.** See canon Â§2A. Agents: translate / verify / holes only â€” **do not invent**.

**Amended 2026-07-14 (D6438) â€” Universal Translator Canon locked.**

**Canon:** [`UNIVERSAL-TRANSLATOR-CANON.md`](./UNIVERSAL-TRANSLATOR-CANON.md) â€” Waves **Aâ€“D** (**G9960â€“G9990**) + **Â§2A D6442**/**D6447**. WISP = POC only.

**Status:** **UT Canon program closed** (**G9990** â€” Waves Aâ€“D). Default queue = maintain canon + Migration OS + edge-only gold. WISP = POC only. **Map/SDK work:** preserve source ArcGIS (and other vendor) behavior â€” no dialect rewrite unless amending the plan again.

When the user says "build" without specifying:

1. **Dual primary (D6540 / G10114)** — **COBOL** prove/residual **or** **language deepen** (unparked skips → route-surface gold; no invent)
2. **Agent-era substrate (D6541 / G10116)** — Hole Type System + CWL-Above-Code + Dispose Plane entry (`hub:agent-era-substrate-smoke`) when ownership/SoR work is in scope
3. **Maintain G9990** — `hub:ut-canon-program-close-smoke` + **G9991** `hub:ut-maintain-packaging-smoke` (**D6440**)
4. **G8550 composite** — `hub:migration-os-close-smoke`
5. **G7690 UT regression** — `hub:cwl-universal-translator-close-smoke`
6. **Origin gold only where a customer/chartered UT edge fails**
7. **Optional POC** — WISP / management.wisptools.io only if explicitly requested → **G9992** `hub:wisp-poc-from-scratch` ([`WISP-POC-FROM-SCRATCH.md`](./WISP-POC-FROM-SCRATCH.md)) — still **true conversion only** (**D6442**/**D6447**)

**Closed program regression:** `hub:ut-canon-program-close-smoke` (**G9990**) Â· `hub:ut-maintain-packaging-smoke` (**G9991**) Â· `hub:ut-wave-a-close-smoke` (**G9965**) Â· `hub:ut-wave-b-close-smoke` (**G9975**) Â· `hub:ut-wave-c-close-smoke` (**G9985**) Â· `hub:ut-wave-d-close-smoke` (**G9989**) Â· `hub:cwl-universal-translator-close-smoke` (**G7690**) Â· `hub:migration-os-close-smoke` (**G8550**) Â· `hub:multi-origin-lift-close-smoke` (**G9880**) Â· `hub:elixir-smoke` (**G9953**, foundation) Â· `hub:dart-smoke` (**G9954**, foundation) Â· `hub:complete-conversion-prove:elixir` (**G9955**, D6448-ST) Â· `hub:complete-conversion-prove:dart` (**G9956**, D6448-ST) Â· `hub:restify-smoke` (**G9957**) Â· `hub:polka-smoke` (**G9958**) Â· `hub:koa-smoke` / `hub:restify-smoke` / `hub:polka-smoke` v2 (**G9959**, pass-through mw) Â· `hub:cobol-clbs-prove-smoke` (**G10001**, CardDemo CSUTLDWY/CSSETATY COPY resolve) Â· `hub:contract-import-cwl-roundtrip-smoke` + `batch-ckprst-copy-resolve` (**G10002**) Â· OpenAPI/HAR cookie peels (**G10031**) Â· OpenAPI/HAR response-header peels (**G10054**) Â· OpenAPI/HAR query-param peels (**G10074**) Â· `hub:fastapi-smoke` (**G10003**) Â· `hub:starlette-smoke` (**G10013**) Â· `hub:ktor-smoke` (**G10004**) Â· `hub:http4k-smoke` (**G10024**) Â· `hub:koa-smoke` / `hub:hapi-smoke` / `hub:restify-smoke` / `hub:polka-smoke` destructure (**G10005**) Â· `hub:dart-smoke` named handlers (**G10007**) Â· `hub:aspnet-controllers-smoke` (**G10008**) Â· `hub:carter-smoke` (**G10041**, Minimal API Map\* peel reuse) Â· `hub:jaxrs-smoke` (**G10012**) Â· `hub:micronaut-smoke` (**G10020**) Â· `hub:quarkus-smoke` (**G10034**, JAX-RS peel reuse) Â· `hub:javalin-smoke` (**G10035**) Â· `hub:sparkjava-smoke` (**G10036**) Â· `hub:jooby-smoke` (**G10046**) Â· `hub:vertx-smoke` (**G10052**) Â· `hub:webflux-smoke` (**G10061**) · `hub:spring-requestmapping-smoke` (**G10071**) Â· `hub:helidon-smoke` (**G10042**, JAX-RS peel reuse) Â· `hub:chi-smoke` (**G10009**) Â· `hub:echo-smoke` (**G10010**) Â· `hub:fiber-smoke` (**G10017**) Â· `hub:iris-smoke` (**G10038**) Â· `hub:beego-smoke` (**G10045**) Â· `hub:buffalo-smoke` (**G10055**) Â· `hub:martini-smoke` (**G10056**) Â· `hub:gorilla-smoke` (**G10018**) Â· `hub:servemux-smoke` (**G10030**) Â· `hub:hummingbird-smoke` (**G10016**) Â· `hub:vapor-group-smoke` (**G10069**) Â· `hub:hono-smoke` (**G10019**) Â· `hub:hono-smoke` v2 (**G10044**, pass-through mw) Â· `hub:elysia-smoke` (**G10025**) Â· `hub:elysia-smoke` v2 (**G10053**, empty lifecycle) Â· `hub:oak-smoke` (**G10043**) Â· `hub:itty-smoke` (**G10047**) Â· `hub:adonis-smoke` (**G10059**) Â· `hub:express-router-smoke` (**G10067**) Â· `hub:bun-serve-smoke` (**G10048**) Â· `hub:cf-workers-smoke` (**G10063**) Â· `hub:litestar-smoke` (**G10021**) Â· `hub:falcon-smoke` (**G10023**) Â· `hub:quart-smoke` (**G10026**) Â· `hub:bottle-smoke` (**G10027**) Â· `hub:slim-smoke` (**G10028**) Â· `hub:lumen-smoke` (**G10049**) Â· `hub:sanic-smoke` (**G10033**) Â· `hub:aiohttp-smoke` (**G10039**) Â· `hub:flask-blueprint-smoke` (**G10070**) Â· `hub:sinatra-ns-smoke` (**G10073**) Â· `hub:poem-smoke` (**G10029**) Â· `hub:salvo-smoke` (**G10037**) Â· `hub:actix-scope-smoke` (**G10068**)

**Amended 2026-07-27 (D6531 / G10069) â€” Vapor route group peel.** `hub-gold-vapor-group` + `hub:vapor-group-smoke` (20/20). Peels literal `app.grouped("prefix")` / nested `api.grouped("items")` / chained `app.grouped("api").get|post|â€¦` PathComponent string joins. Vapor remains Swift D6448-ST; Hummingbird secondary must not regress. Fluent/Leaf/middleware-only `grouped` / Hummingbird `router.group` = honest holes. Catalog: [`swift-vapor-group-honest-holes.json`](../fixtures/ci/swift-vapor-group-honest-holes.json).

**Amended 2026-07-27 (D6528 / G10066) â€” Gin route Group prefix peel.** `hub-gold-gin-group` + `hub:gin-group-smoke` (20/20). Peels literal `r.Group("/prefix")` / nested `g.Group("/sub")` + `g.GET|POST|â€¦` path join (also chained `r.Group("/p").GET("/q")`). Flat Gin ST remains `hub-flagship-go` / `hub:go-flagship`. Non-literal Group / `Group("/p", mwâ€¦)` / `g.Use` = honest holes (no invent). Chi/Echo/Fiber Group stay dialect honest holes. Catalog: `fixtures/ci/go-secondary-dialect-honest-holes.json`.

**Amended 2026-07-27 (D6529 / G10067) â€” Express Router mount peel.** `hub-gold-express-router` + `hub:express-router-smoke` (20/20). Peels `express.Router()` + `router.get|post|â€¦` + `app.use('/prefix', router)` literal path join; empty/next-only `app.use` stays `js.passthrough` (G9959). Complex `use(prefix, mw, router)` = honest holes. Express/TS remain D6448-ST. Catalog: [`js-secondary-dialect-honest-holes.json`](../fixtures/ci/js-secondary-dialect-honest-holes.json).

**Amended 2026-07-27 (D6535 / G10073) â€” Sinatra namespace/prefix path peel.** `hub-gold-sinatra-ns` + `hub:sinatra-ns-smoke` (20/20). Peels literal `namespace "/api" do â€¦ get|post|â€¦ "/path"` (and `namespace :api do`) path join â€” deepens Sinatra D6448-ST (not a secondary). Roda/Grape/Padrino stay green. Rack `map` / `:conditions` / invented `base.path` = honest holes. Rails stays skipped (G10006). Catalog: `fixtures/ci/sinatra-ns-honest-holes.json`.

**Amended 2026-08-03 (G10114 / D6540) — Revel Go secondary unparked.** Was G10065 skip. Now `hub-gold-revel` + `hub:revel-smoke` (20/20): peel `conf/routes` `METHOD PATH Controller.Action` + same-project `func (c App) Action() revel.Result` bodies (`RenderJSON` / `Response.Status` / `Params.Route|Query.Get`). No invented `router.GET` façades or interceptors. Gin remains Go D6448-ST. Catalog: [`fixtures/ci/revel-honest-skip.json`](../fixtures/ci/revel-honest-skip.json) (`closed-route-surface`) · [`fixtures/ci/go-secondary-dialect-honest-holes.json`](../fixtures/ci/go-secondary-dialect-honest-holes.json).

**Amended 2026-07-27 (G10065) — Revel Go secondary skipped.** *(Superseded by **G10114** unpark.)* `conf/routes` `METHOD PATH Controller.Action` + `func (c App) Action() revel.Result` was not Gin/Buffalo/Martini/Beego-functional peel-reuse. Honest skip catalog retained under new `closed-route-surface` decision.

**Amended 2026-07-27 (D6521 / G10059) â€” AdonisJS TypeScript ORIGIN secondary dialect.** `hub-gold-adonis` + `hub:adonis-smoke` (20/20). Peels `Route.get|post|â€¦` / `router.get` in `start/routes.ts`, `:id` via `request.param`, `request.qs().q`, `response.json` / `response.status(N).json`. Express/TS remain D6448-ST. Lucid / IoC / controller string refs = honest holes (no invent). Catalog: [`js-secondary-dialect-honest-holes.json`](../fixtures/ci/js-secondary-dialect-honest-holes.json).

**Amended 2026-07-27 (D6532 / G10070) â€” Flask Blueprint secondary peel.** `hub-gold-flask-blueprint` + `hub:flask-blueprint-smoke` (20/20). Peels same-file `Blueprint('name', â€¦, url_prefix='/lit')` + `@bp.get|post|route|â€¦` with literal `url_prefix` path join (additive `parse_routes.py` peels). Flask `@app.*` remains Python D6448-ST; FastAPI/Starlette/Litestar/Falcon/Quart/Bottle/Sanic/aiohttp/Tornado stay green. Cross-file Blueprint / `register_blueprint` prefix override / nested / middleware = honest holes. Catalog: `fixtures/ci/flask-blueprint-honest-holes.json`.

**Amended 2026-07-27 (D6530 / G10068) â€” Actix Web scope nest path-join deepen.** `hub-gold-actix-scope` + `hub:actix-scope-smoke` (20/20). Peels literal `web::scope("/prefix").service(handler)` / `.route("â€¦", web::METHOD().to(handler))` path join with relative `#[get|post|â€¦]` macros under scope. Flagship `hub-flagship-rust` stays flat D6448-ST; Axum/Rocket/Poem/Salvo stay green. Nested scope / `.guard` / `web::resource` = honest holes. Catalog: [`actix-scope-honest-holes.json`](../fixtures/ci/actix-scope-honest-holes.json).

**Amended 2026-07-27 (D6525 / G10063) â€” Cloudflare Workers fetch-export JS/TS ORIGIN secondary dialect.** `hub-gold-cf-workers` + `hub:cf-workers-smoke` (20/20). Peels `export default { async fetch(request, env, ctx) { â€¦ } }` with `` switch (`${request.method} ${url.pathname}`) `` / method+pathname `if`, `Response.json` / `{ status: N }`, `url.searchParams.get`. Express/TS remain D6448-ST; **itty-router** remains Workers router dialect (D6509); Bun.serve stays green. KV/D1/`env` / dynamic segments / opaque fetch = honest holes. Catalog: [`js-secondary-dialect-honest-holes.json`](../fixtures/ci/js-secondary-dialect-honest-holes.json).

**Amended 2026-07-27 (D6524 / G10062) â€” Padrino Ruby secondary dialect.** `hub-gold-padrino` + `hub:padrino-smoke` (20/20). Peels `Padrino.configure_apps` + `class HubApp < Padrino::Application` + flat Sinatra-compatible `get|post|â€¦ "/path"`, `/:id`, Hash/`status`/`params[]` â€” **reuses Sinatra peels** (same cheap path as Grape G10032). Sinatra remains Ruby D6448-ST; Roda/Grape stay green. Symbol controllers/`Padrino.mount`/filters = honest holes. Catalog: `fixtures/ci/padrino-honest-holes.json`. Rails stays skipped (G10006).

**Amended 2026-07-27 (D6510 / G10048) â€” Bun.serve TypeScript ORIGIN secondary dialect.** `hub-gold-bun-serve` + `hub:bun-serve-smoke` (20/20). Peels `Bun.serve({ routes: { "/path": { GET|POST|â€¦: handler } } })`, `:id` paths, `req.params`, `new URL(req.url).searchParams.get`, `Response.json` / `Response.json(body, { status: N })`. Express/TS remain D6448-ST. `fetch` fallback / websocket / plugins / static Response = honest holes. Catalog: [`js-secondary-dialect-honest-holes.json`](../fixtures/ci/js-secondary-dialect-honest-holes.json).

**Amended 2026-07-27 (D6522 / G10060) â€” Deno.serve TypeScript ORIGIN secondary skipped.** `Deno.serve(handler)` has **no** Bun-like `{ routes }` object; origin routing is pathname+method switch / `URLPattern` / `@std/http` `route` â€” control-flow peels, not Bun routes-object reuse (D6510 already holes switch-only servers). Probe: `astRouteCount` 0. Honest skip: [`fixtures/ci/deno-serve-honest-skip.json`](../fixtures/ci/deno-serve-honest-skip.json). Oak / Bun.serve / itty remain green. Catalog: `fixtures/ci/js-secondary-dialect-honest-holes.json`.

**Amended 2026-07-24 (D6499 / G10037) â€” Salvo Rust secondary dialect.** `hub-gold-salvo` + `hub:salvo-smoke` (20/20). Peels `Router::with_path("â€¦").get|post|â€¦(handler)` / `.path` + flat `.push`, `{id}` paths, `req.param`/`req.query`, `Json(serde_json::json!)` + `res.status_code(StatusCode::*)`. Actix remains Rust D6448-ST; Axum/Rocket/Poem stay green. Nested push path-join / hoop / OpenAPI = honest holes. Catalog: `fixtures/ci/salvo-honest-holes.json`.

**Amended 2026-07-24 (D6501 / G10039) â€” aiohttp Python secondary dialect.** `hub-gold-aiohttp` + `hub:aiohttp-smoke` (20/20). Peels `web.Application()`, `web.get|post|â€¦('/path', handler)`, `{id}` / `{id:\d+}` paths, `request.match_info`, `request.query.get`, `web.json_response` / `web.Response` (additive `parse_routes.py` peels). Flask remains Python D6448-ST. Middleware/subapp/`web.View`/WebSocket = honest holes. Catalog: `fixtures/ci/aiohttp-honest-holes.json`.

**Amended 2026-07-27 (G10050) â€” Nancy FX C# secondary skipped.** NancyModule constructor `Get|Post|â€¦` + `Response.AsJson` / `HttpStatusCode` / dynamic `parameters.id` is **not** Minimal API Map* peel-reuse (unlike Carter D6503). Probe: 0 routes on current `parseCsharpRoutes`. Honest skip: [`fixtures/ci/nancy-honest-skip.json`](../fixtures/ci/nancy-honest-skip.json). No D6512. Carter + ASP.NET controllers remain green. Catalog: `fixtures/ci/csharp-secondary-dialect-honest-holes.json`.

**Amended 2026-07-27 (G10057) â€” Tapir Scala secondary skipped.** Fluent `endpoint.get.in("path").out(jsonBody|plainBody|â€¦)` (+ optional Http4s/Akka server interpreters / `serverLogicSuccess`) is **not** Finch string-led `get("path") { Ok(â€¦) }` or Http4s `case â†’ Ok` peel-reuse (G10051 / Http4s secondary). Probe: 0 routes on current `parseScalaRoutes`. Codec `.out` invent forbidden (**D6447**); path+method-only is not 20/20 hole-free. Honest skip: [`fixtures/ci/tapir-honest-skip.json`](../fixtures/ci/tapir-honest-skip.json). No D6519. Akka remains Scala D6448-ST; Http4s + Finch remain green.

**Amended 2026-07-24 (D6503 / G10041) â€” Carter C# secondary dialect.** `hub-gold-carter` + `hub:carter-smoke` (20/20). Peels `ICarterModule` + `AddRoutes(IEndpointRouteBuilder app)` + `app.MapGet|MapPost|â€¦` â€” **reuses Minimal API Map\* peels** (no MapCarter/DI invent). Minimal API remains C# D6448-ST; ASP.NET controllers remain first C# secondary. Catalog: `fixtures/ci/csharp-secondary-dialect-honest-holes.json`.


**Amended 2026-07-24 (D6506 / G10044) â€” Hono empty/next-only pass-through middleware.** Parallel to G9959: peel Hono ORIGIN `app.use` empty/`await next()`/`return next()` as `js.passthrough` (shared `hub-express-middleware.mjs`; no onion invent). `hub:hono-smoke` schema v2 (20 + 2 mw). Complex Hono middleware stays honest holes. Catalog: [`js-secondary-dialect-honest-holes.json`](../fixtures/ci/js-secondary-dialect-honest-holes.json). **â‰  emit-hono.**
**Amended 2026-07-27 (D6515 / G10053) â€” Elysia empty lifecycle pass-through.** Parallel to G10044/G9959: peel empty ORIGIN `app.onRequest(() => {})` / `app.onBeforeHandle(() => {})` as `js.passthrough`. Elysia plugin `.use` is **not** `(ctx, next)` â€” honest hole (no invent). `hub:elysia-smoke` schema v2 (20 + 2 mw). Catalog: [`js-secondary-dialect-honest-holes.json`](../fixtures/ci/js-secondary-dialect-honest-holes.json).

**Amended 2026-07-27 (D6517 / G10055) â€” Go Buffalo secondary dialect.** `hub-gold-buffalo` + `hub:buffalo-smoke` (20/20). Peels `app.GET|POST|â€¦`, `{id}`/`:id` paths, `c.Param`, `c.Render`/`r.JSON`/`r.String`. Gin remains Go D6448-ST. Middleware/Group/Resource/binders/HTML/non-literal paths = honest holes. Catalog: `fixtures/ci/go-secondary-dialect-honest-holes.json`.

**Amended 2026-07-27 (D6518 / G10056) â€” Go Martini secondary dialect.** `hub-gold-martini` + `hub:martini-smoke` (20/20). Peels `martini.Classic()`, `m.Get|Post|â€¦`, `:id` paths, `params["id"]` (`martini.Params`), `req.URL.Query().Get`, `r.JSON` / `json.NewEncoder(w)` / `io.WriteString` / string returns. Gin remains Go D6448-ST. Use/Group/Map/binding/non-literal paths = honest holes. Catalog: `fixtures/ci/go-secondary-dialect-honest-holes.json`.

**Amended 2026-07-27 (D6507 / G10045) â€” Go Beego v2 functional secondary dialect.** `hub-gold-beego` + `hub:beego-smoke` (20/20). Peels `web.Get|Post|â€¦`, `:id` paths, `ctx.Input.Param(":id")`, `ctx.Input.Query`, `ctx.JSONResp` / `ctx.Output.SetStatus` / `ctx.WriteString`. Gin remains Go D6448-ST. Filter/NS/Controller/binders/non-literal paths = honest holes. Catalog: `fixtures/ci/go-secondary-dialect-honest-holes.json`.




**Amended 2026-07-27 (D6511 / G10049) â€” Lumen / Laravel-router PHP secondary dialect.** `hub-gold-lumen` + `hub:lumen-smoke` (20/20). Peels `$router->get|post|â€¦` / `Route::get|post` closures, `{id}` path args, `$request->query|input`, `response()->json` (+ status) â€” additive `php-ast-ingest.mjs` (Slim G10028 unchanged; packages/ingest Laravel/Symfony/plain unchanged). Laravel min / Symfony / plain-php remain PHP D6448-ST. Middleware/`$router->group`/cross-file controllers = honest holes. Catalog: `fixtures/ci/lumen-honest-holes.json`.
**Amended 2026-07-24 (D6490 / G10028) â€” Slim PHP secondary dialect.** `hub-gold-slim` + `hub:slim-smoke` (20/20). Peels `$app->get|post|â€¦`, `{id}` paths, `$args['â€¦']`, `$request->getQueryParams()`, `$response->withJson` / `withStatus` / write+json_encode (`php-ast-ingest.mjs`; packages/ingest Laravel/Symfony/plain unchanged). Laravel min / Symfony / plain-php remain PHP D6448-ST. PSR-15/`$app->group`/named handlers = honest holes. Catalog: `fixtures/ci/slim-honest-holes.json`.

**Amended 2026-07-24 (D6495 / G10033) â€” Sanic Python secondary dialect.** `hub-gold-sanic` + `hub:sanic-smoke` (20/20). Peels `@app.get|post|â€¦` / `@app.route`, `<id>` / `<id:str>` paths, `request.args.get`, `json()` / `text()` (+ `status=`) â€” additive `parse_routes.py` peels. Flask remains Python D6448-ST. Middleware/Blueprint/listeners/WebSocket = honest holes. Catalog: `fixtures/ci/sanic-honest-holes.json`.

**Amended 2026-07-24 (D6500 / G10038) â€” Go Iris secondary dialect.** `hub-gold-iris` + `hub:iris-smoke` (20/20). Peels `iris.New()`, `app.Get|Post|â€¦`, `{id}`/`:id` paths, `ctx.Params().Get`, `ctx.URLParam`/`URLParamDefault`, `ctx.JSON`/`ctx.StatusCode`/`ctx.WriteString`. Gin remains Go D6448-ST. Middleware/Party/binders/non-literal paths = honest holes. Catalog: `fixtures/ci/go-secondary-dialect-honest-holes.json`.

**Amended 2026-07-24 (D6492 / G10030) â€” Go net/http ServeMux (Go 1.22+) secondary dialect.** `hub-gold-servemux` + `hub:servemux-smoke` (20/20). Peels `http.NewServeMux()`, `HandleFunc("METHOD /path")`, `{id}` paths, `r.PathValue`, `r.URL.Query().Get`, `json.NewEncoder(w).Encode`, `w.WriteHeader(http.Status*)`. Gin remains Go D6448-ST. Middleware wrappers (stdlib none) / pattern conflicts / non-literal paths = honest holes. Catalog: `fixtures/ci/go-secondary-dialect-honest-holes.json`.

**Amended 2026-07-24 (D6491 / G10029) â€” Poem Rust secondary dialect.** `hub-gold-poem` + `hub:poem-smoke` (20/20). Peels `Route::new().at("/path", get|post|â€¦(handler))`, `.nest("/prefix", named_fn())`, `:id` paths, `Path`/`Query`, `Json(serde_json::json!)`, `(StatusCode::*, Json(â€¦))`. Actix remains Rust D6448-ST; Axum/Rocket stay green. Middleware/poem-openapi/chained multi-method `.at` = honest holes. Catalog: `fixtures/ci/poem-honest-holes.json`.

**Amended 2026-07-24 (D6497 / G10035) â€” Javalin Java secondary dialect.** `hub-gold-javalin` + `hub:javalin-smoke` (20/20). Peels `Javalin.create()`, `app.get|post|put|patch|delete("/path", ctx -> â€¦)`, `{id}` paths, `ctx.pathParam`/`ctx.queryParam`, `ctx.status(n).json`/`ctx.json`/`ctx.result`. Spring remains Java D6448-ST. Plugins/`before`/`after`/DI/WebSocket = honest holes. Catalog: `fixtures/ci/java-secondary-dialect-honest-holes.json`.


**Amended 2026-07-27 (D6533 / G10071) — Spring MVC class+method @RequestMapping peel deepen.** `hub-gold-spring-requestmapping` + `hub:spring-requestmapping-smoke` (20/20). Peels class `@RequestMapping` prefix join + method `@GetMapping|PostMapping|…` + method-level `@RequestMapping(method=RequestMethod.*)` + multi-path arrays. Spring MVC `@RestController` remains Java D6448-ST; Micronaut/JAX-RS/WebFlux stay green. DI/filters / `@RequestMapping` without `RequestMethod.*` = honest holes. Catalog: `fixtures/ci/java-secondary-dialect-honest-holes.json`.

**Amended 2026-07-27 (D6523 / G10061) â€” Spring WebFlux RouterFunctions Java secondary dialect.** `hub-gold-webflux` + `hub:webflux-smoke` (20/20). Peels `route(GET|POST|â€¦("/path"), req -> â€¦)` / `.andRoute`, `{id}` + `pathVariable`/`queryParam`, `ServerResponse.ok|status().bodyValue`. Spring MVC `@RestController` remains Java D6448-ST; JAX-RS/Javalin/Jooby/Vert.x peers stay green. WebClient/route-builder/path-nest/filters = honest holes. Catalog: `fixtures/ci/java-secondary-dialect-honest-holes.json`.

**Amended 2026-07-27 (D6508 / G10046) â€” Jooby Java secondary dialect.** `hub-gold-jooby` + `hub:jooby-smoke` (20/20). Peels `new Jooby() {{ get|post|â€¦ }}` / `app.get|post|â€¦`, `{id}` paths, `ctx.path`/`ctx.query`, `ctx.setResponseCode`, Map.of + scalar returns. Spring remains Java D6448-ST; Javalin/Spark/JAX-RS peers stay green. Module/MVC/filters/WebSocket = honest holes. Catalog: `fixtures/ci/java-secondary-dialect-honest-holes.json`.

**Amended 2026-07-24 (D6504 / G10042) â€” Helidon MP JAX-RS Java secondary dialect.** `hub-gold-helidon` + `hub:helidon-smoke` (20/20). Helidon MP HTTP uses standard JAX-RS (`jakarta.ws.rs.*`); **reuses G10012 peels** via `runJaxrsSmoke` â€” no Helidon CDI/MP Config/SE invent. Spring remains Java D6448-ST. Catalog: `fixtures/ci/java-secondary-dialect-honest-holes.json`.

**Amended 2026-07-24 (D6496 / G10034) â€” Quarkus JAX-RS Java secondary dialect.** `hub-gold-quarkus` + `hub:quarkus-smoke` (20/20). Quarkus HTTP uses standard JAX-RS (`jakarta.ws.rs.*`); **reuses G10012 peels** via `runJaxrsSmoke` â€” no Quarkus CDI/RESTEasy/Panache invent. Spring remains Java D6448-ST. Catalog: `fixtures/ci/java-secondary-dialect-honest-holes.json`.

**Amended 2026-07-24 (D6489 / G10027) â€” Bottle Python secondary dialect.** `hub-gold-bottle` + `hub:bottle-smoke` (20/20). Peels bare `@get|post|â€¦` / `@route(..., method=)`, `<id>` paths, `request.query.q` / `request.params`, dict/string / `HTTPResponse(body, status=N)` (additive `parse_routes.py` peels). Flask remains Python D6448-ST. Plugins/middleware/templates/mount = honest holes. Catalog: `fixtures/ci/bottle-honest-holes.json`.

**Amended 2026-07-27 (D6536 / G10074) â€” OpenAPI/HAR query-param peel deepen.** OpenAPI IDENT-safe `in: query` â†’ CWL `query` with `schema.default` else `example` when present; HAR IDENT-safe `queryString` â†’ CWL `query` with observed value when present (never invent when absent). Cookie/header/response-header peels unchanged. Gold `hub-gold-openapi-cwl` / `hub-gold-har-cwl`; Vitest G10074; smoke `hub:contract-import-cwl-roundtrip-smoke`. `/raw` stays hole.

**Amended 2026-07-27 (D6516 / G10054) â€” OpenAPI/HAR response-header peel deepen.** OpenAPI IDENT-safe response `headers` â†’ CWL `response-header` when example/schema.default present; HAR IDENT-safe `response.headers` (skip hop-by-hop / `content-type`; never invent when absent). Gold `hub-gold-openapi-cwl` / `hub-gold-har-cwl`; Vitest G10054; smoke `hub:contract-import-cwl-roundtrip-smoke`. `/raw` stays hole.

**Amended 2026-07-24 (D6493 / G10031) â€” OpenAPI/HAR cookie request-surface deepen.** OpenAPI IDENT-safe `in: cookie` â†’ CWL `cookie`; HAR IDENT-safe `cookies[]` â†’ CWL `cookie` when present (never invent when absent). Gold `hub-gold-openapi-cwl` / `hub-gold-har-cwl`; Vitest G10031; smoke `hub:contract-import-cwl-roundtrip-smoke`. `/raw` and BMS stay honest holes.

**Amended 2026-07-24 (D6488 / G10026) â€” Quart Python secondary dialect.** `hub-gold-quart` + `hub:quart-smoke` (20/20). Peels Flask-async twin `@app.get|post|â€¦` / `@app.route`, `<id>` paths, `request.args`, status tuples (reuses Flask peels in `parse_routes.py`). Flask remains Python D6448-ST. Middleware/WebSocket/Blueprint beyond cheap = honest holes. Catalog: `fixtures/ci/quart-honest-holes.json`.

**Amended 2026-07-24 (D6479 / G10017) â€” Go Fiber secondary dialect.** `hub-gold-fiber` + `hub:fiber-smoke` (20/20). Peels `app.Get|Post|â€¦`, `:id` paths, `c.Params`, `c.Query`, `c.JSON` / `c.Status(n).JSON` / `c.SendString`. Gin remains Go D6448-ST. Middleware/Group/`BodyParser`/non-literal paths = honest holes. Catalog: `fixtures/ci/go-secondary-dialect-honest-holes.json`.

**Amended 2026-07-24 (D6480 / G10018) â€” Go Gorilla mux secondary dialect.** `hub-gold-gorilla` + `hub:gorilla-smoke` (20/20). Peels `HandleFunc`+`Methods`, `{id}` paths, `mux.Vars`, `r.URL.Query().Get`, `json.NewEncoder(w).Encode`, `w.WriteHeader(http.Status*)`. Gin remains Go D6448-ST. Middleware/Subrouter/non-literal paths = honest holes. Catalog: `fixtures/ci/go-secondary-dialect-honest-holes.json`.

**Amended 2026-07-24 (D6482 / G10020) â€” Micronaut Java secondary dialect.** `hub-gold-micronaut` + `hub:micronaut-smoke` (20/20). Peels `@Controller` prefix join + `@Get|Post|â€¦` + `@PathVariable`/`@QueryValue`(+`defaultValue`) + `Map.of` + `HttpResponse.status().body()`. Spring remains Java D6448-ST. DI/filters/`Application.run` = honest holes. Catalog: `fixtures/ci/java-secondary-dialect-honest-holes.json`.

**Amended 2026-07-24 (D6474 / G10012) â€” JAX-RS Java secondary dialect.** `hub-gold-jaxrs` + `hub:jaxrs-smoke` (20/20). Peels class `@Path` prefix join + method `@GET|POST|â€¦` + `@PathParam`/`@QueryParam`/`@DefaultValue` + `Map.of` + `Response.status().entity().build()`. Spring remains Java D6448-ST. CDI/filters/providers/Application = honest holes.

**Amended 2026-07-24 (D6478 / G10016) â€” Hummingbird Swift secondary dialect.** `hub-gold-hummingbird` + `hub:hummingbird-smoke` (20/20). Peels `router.get|post|â€¦`, `:id` paths, `context.parameters.get`, `request.uri.queryParameters`, `Response(status:, body: HTTPBody(json:))`. Vapor remains Swift D6448-ST. Fluent/Leaf/auth/group = honest holes. Catalog: `fixtures/ci/swift-hummingbird-honest-holes.json`.

**Amended 2026-07-24 (D6471 / G10009) â€” Go Chi secondary dialect.** `hub-gold-chi` + `hub:chi-smoke` (20/20). Peels `r.Get|Post|â€¦`, `{id}` paths, `chi.URLParam`, `r.URL.Query().Get`, `json.NewEncoder(w).Encode`, `w.WriteHeader(http.Status*)`. Gin remains Go D6448-ST. Middleware/Mount/non-literal paths = honest holes.

**Amended 2026-07-24 (D6470 / G10008) â€” ASP.NET controller secondary dialect.** `hub-gold-aspnet-controllers` + `hub:aspnet-controllers-smoke` (20/20). Peels `[ApiController]` + `[Route]` prefix join + `[HttpGet|Post|â€¦]` + controller method bodies (`Results.Json`, scalars, path/query params, `statusCode:`). Minimal API remains C# D6448-ST. DI/filter pipeline/Razor = honest holes.

**Amended 2026-07-24 (D6469 / G10007) â€” Dart Shelf same-file named handlers.** Peel `router.get('/x', myHandler)` when `myHandler` is a same-file `Response|Future<Response> name(Request â€¦)` function (Axum/Go Gin parallel). Cross-file named / Flutter / Frog / Pipeline stay honest holes. `hub:dart-smoke` + `hub:dart-flagship` remain 20/20 hole-free.

**Amended 2026-07-24 (D6468 / G10005) â€” Thin-Node IDENT destructure peel.** Shared JS AST peels `const { x } = ctx.params|query|request.body`, `request.params|query|payload`, `req.params|query` into CWL path/query/body request fields. Gold fixtures `hub-gold-koa|hapi|restify|polka` use destructure on 2 routes each; smokes stay 20/20 hole-free. Nested/computed/rest destructure = honest holes (no invent). No Koa onion / Hapi plugins / Nest DI.

**Amended 2026-07-24 (D6467 / G10004) â€” Ktor secondary dialect.** `hub-gold-ktor` + `hub:ktor-smoke` (20/20). Peels `routing { get|post|â€¦ }`, `{id}` paths, `call.parameters`, `call.request.queryParameters`, `HttpStatusCode` on `call.respond`. Spring remains Kotlin D6448-ST. Auth/plugins/nested routing = honest holes.

**Amended 2026-07-24 (D6486 / G10024) â€” http4k Kotlin secondary dialect.** `hub-gold-http4k` + `hub:http4k-smoke` (20/20). Peels `"path" bind Method.GET|POST|â€¦ to`, `{id}` paths, `req.path` / `req.query`, `Response(OK|CREATED|ACCEPTED).body`. Spring remains Kotlin D6448-ST; Ktor remains first Kotlin secondary. Filters/lenses/nested routes/server backends = honest holes. Catalog: `fixtures/ci/http4k-honest-holes.json`.

**Amended 2026-07-27 (D6509 / G10047) â€” itty-router JS/TS ORIGIN secondary dialect.** `hub-gold-itty` + `hub:itty-smoke` (20/20). Peels `Router()`, `router.get|post|â€¦`, `:id` via `request.params`, query from URL `searchParams`, `json()` / `Response.json` / `new Response` (+ ResponseInit status). Express/TS remain D6448-ST. Empty `router.all` closed via G10064 / D6526; complex middleware/nested Router = honest holes. Catalog: `fixtures/ci/js-secondary-dialect-honest-holes.json`.

**Amended 2026-07-27 (D6526 / G10064) â€” itty-router empty/next-only pass-through middleware peel.** Parallel to Hono (D6506 / G10044) and Elysia empty lifecycle (D6515 / G10053): itty has **no** Express-style `next()` â€” continue by omitting return. Peel empty/`next`-only `router.all(pathLit, fn)` as `js.passthrough`. Gold `hub-gold-itty` +2 empty `router.all('*', () => {})`; `hub:itty-smoke` schema v2 (20 routes + 2 mw presets). Complex `all` / multi-handler / nested Router stay honest holes.

**Amended 2026-07-24 (D6505 / G10043) â€” Oak Deno/JS ORIGIN secondary dialect.** `hub-gold-oak` + `hub:oak-smoke` (20/20). Peels `new Application()`, `router.get|post|â€¦`, `:id` / `{id}` (brace â†’ `:id`), `ctx.params`, `ctx.request.url.searchParams.get`, `ctx.response.body` / `ctx.response.status`. Express/TS remain D6448-ST. Middleware/`router.routes()` = honest holes. Catalog: `fixtures/ci/js-secondary-dialect-honest-holes.json`.

**Amended 2026-07-24 (D6487 / G10025) â€” Elysia TypeScript ORIGIN secondary dialect.** `hub-gold-elysia` + `hub:elysia-smoke` (20/20). Peels `new Elysia()`, `app.get|post|â€¦`, `ctx.params`/`ctx.query`, IDENT-safe `({ params: { id } })` / `({ query: { q } })` bags (G10005 reuse), `ctx.set.status`, literal/object returns. Express/TS remain D6448-ST. Plugins/lifecycle/macros = honest holes. Catalog: `fixtures/ci/js-secondary-dialect-honest-holes.json`.

**Amended 2026-07-24 (D6481 / G10019) â€” Hono TypeScript ORIGIN secondary dialect.** `hub-gold-hono` + `hub:hono-smoke` (20/20). Peels `new Hono()`, `app.get|post|â€¦`, `c.req.param`/`c.req.query`, `c.json`/`c.text` (+ numeric status). Express/TS remain D6448-ST. **â‰  emit-hono** outbound. Middleware/`app.use` = honest holes. Catalog: `fixtures/ci/js-secondary-dialect-honest-holes.json`.

**Amended 2026-07-24 (D6483 / G10021) â€” Litestar secondary dialect.** `hub-gold-litestar` + `hub:litestar-smoke` (20/20). Peels bare `@get|post|â€¦`, `{id}` paths, `request.query_params`, decorator `status_code=` (reuses FastAPI/Starlette peels). Flask remains Python D6448-ST. Provide/DI/middleware/Controller/`Response` wrappers/WebSocket = honest holes.

**Amended 2026-07-24 (D6485 / G10023) â€” Falcon Python secondary dialect.** `hub-gold-falcon` + `hub:falcon-smoke` (20/20). Peels same-file `app.add_route` + class `on_get|on_post|â€¦`, `{id}` paths, `req.get_param`, `resp.media`/`resp.text`/`resp.status`. Flask remains Python D6448-ST. Hooks/middleware/ASGI onion = honest holes.

**Amended 2026-07-24 (D6475 / G10013) â€” Starlette secondary dialect.** `hub-gold-starlette` + `hub:starlette-smoke` (20/20). Peels `@app.route(..., methods=[...])`, `{id}` paths, `request.query_params`, Flask-style `(body, status)` tuple returns. Flask remains Python D6448-ST. Mount/middleware/ASGI onion / `Route()`-table-only = honest holes.

**Amended 2026-07-24 (D6466 / G10003) â€” FastAPI secondary dialect.** `hub-gold-fastapi` + `hub:fastapi-smoke` (20/20). Peels `{id}` paths, `request.query_params`, decorator `status_code=`. Flask remains Python D6448-ST. Depends/OAuth/middleware = honest holes.

**Amended 2026-07-24 (D6465 / G10002) â€” Contract request-surface deepen + CKPRST COPY + Nest ST board sync.** OpenAPI peels IDENT-safe `in: header` + flat `requestBody` example keys as CWL `header`/`body`; HAR peels IDENT-safe headers + flat JSON `postData`. Promote `CKPRST.cpy` + structural `CKPRSTCP`. NestJS route-surface ST listed on leadership scoreboard + public claim. CONTRIBUTING refuses private corpora on `main`. `/raw` and BMS maps stay honest holes.

**Amended 2026-07-24 (D6464 / G10001) â€” CardDemo CSUTLDWY/CSSETATY COPY resolve.** Promote date/set-attr copybooks into `fixtures/hub-cobol-clbs-mini/copybook/`; COACTUPC/COTRTUPC prove requires resolve. DFHAID/DFHBMSCA stay BMS holes (no invent). Behavioral still paused **61/61**. Scoreboard: [`LEADERSHIP-SCOREBOARD.md`](./LEADERSHIP-SCOREBOARD.md).

**Amended 2026-07-24 (D6463 / G9959) â€” Thin-Node pass-through middleware peel.** Empty/next-only `app.use` / Restify `server.pre|use` â†’ `js.passthrough` / `restify.passthrough` presets. Complex middleware = honest holes (no onion invent). Scoreboard: [`LEADERSHIP-SCOREBOARD.md`](./LEADERSHIP-SCOREBOARD.md). Cheap deepen queue exhausted pending Flutter/LiveView/COBOL charter.

**Amended 2026-07-24 (D6462 / G9958) â€” Polka secondary dialect.** `hub-gold-polka` + `hub:polka-smoke` (20/20). Completes thin Node secondary set. Not ST. Phoenix controller peel skipped (not cheap; honest skip catalog).

**Amended 2026-07-24 (D6461 / G9957) â€” Restify secondary dialect.** `hub-gold-restify` + `hub:restify-smoke` (20/20). Shared JS AST: `del`â†’DELETE + Restify two-arg `res.send`. Not ST.

**Amended 2026-07-24 (D6460 / G9956) â€” Dart/Shelf route-surface D6448-ST.** `hub:dart-flagship` + `hub:complete-conversion-prove:dart` â†’ `stGreen`+`stClosed`. Flutter/Dart Frog/Pipeline = honest holes. Phoenix peel deferred.

**Amended 2026-07-24 (D6459 / G9955) â€” Elixir Plug.Router route-surface D6448-ST.** `hub:elixir-flagship` + `hub:complete-conversion-prove:elixir` â†’ `stGreen`+`stClosed`. Phoenix LiveView/controllers = honest holes (no invent).

**Amended 2026-07-24 (D6458 / G9954) â€” Dart/Shelf foundation.** Chartered Dart origin gold: `hub-gold-dart-shelf` + `hub:dart-smoke` (20/20 hole-free). Flutter/Dart Frog/Pipeline = honest holes. Phoenix controller peel deferred (no LiveView invent).

**Amended 2026-07-24 (D6457 / G9953) â€” Elixir Plug.Router foundation.** Chartered BEAM origin gold: `hub-gold-elixir-plug` + `hub:elixir-smoke` (20/20 hole-free). Phoenix LiveView/controllers = honest holes. Dart closed via D6458.

**Index:** [`UNIVERSAL-TRANSLATOR-CANON.md`](./UNIVERSAL-TRANSLATOR-CANON.md) Â· [`initiative-knowledge.v1.json`](./initiative-knowledge.v1.json) Â· [`MIGRATION-OS.md`](./MIGRATION-OS.md) Â· [`AI-ASSIST.md`](./AI-ASSIST.md) Â· [`PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md)

---

## 12 (archived) â€” Default queue (superseded 2026-07-14 by D6438)

**Amended 2026-07-14 (D6437) â€” Universal Translator reframing (WISP = POC only).** Superceded by **D6438** canon.

**Amended 2026-07-14 (D6436 / G9952) / 2026-07-13 (D6435 / G9951)** â€” WISP POC closes (Firebase look, module depth).

---

## 12 (archived) â€” Default queue (superseded 2026-07-13 by D6435 / G9951)

**Amended 2026-07-13 (D6434 / G9950) â€” Module_Manager buttons converted.**

**Status:** **G9950** closed. Plan/deploy toolbars + structural Search/Export/Scan + marketing spatial discover over API geometry. Prior map interact (**G9949**) / ArcGIS grind (**G9947â€“G9948**) remain. LiteRT refused. GenieACS OOS.

When the user says "build" without specifying:

1. **G8550 composite** â€” `hub:migration-os-close-smoke`
2. **Migration Chat / AI Assist regression** â€” `hub:migration-chat-smoke`
3. **Multi-origin regression** â€” `hub:multi-origin-lift-close-smoke` Â· `hub:multi-origin-convert-orch-smoke`
4. **WISP regression** â€” `hub:wisp-cwl-module-buttons-smoke` Â· `hub:wisp-cwl-map-interact-smoke` Â· arcgis/remaining smokes Â· `wisp:operator-verify -- --require`
5. **Optional Tier C entry** â€” only after an explicit plan amendment naming Blazor/ERB/Django/Flutter

**Closed program regression:** `hub:wisp-cwl-module-buttons-smoke` (**G9950**) Â· `hub:wisp-cwl-map-interact-smoke` (**G9949**) Â· `hub:wisp-cwl-arcgis-grind-smoke` (**G9947â€“G9948**) Â· `hub:migration-os-close-smoke` (**G8550**) Â· `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) Â· [`docs/AI-ASSIST.md`](./AI-ASSIST.md) Â· [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) Â· [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) â€” Default queue (superseded 2026-07-13 by D6434 / G9950)

**Amended 2026-07-13 (D6433 / G9949) â€” SharedMapâ†”ArcGIS interaction converted.**

**Status:** **G9949** closed. Plan/deploy chrome drives coverage-map via converted Module_Manager postMessage protocol (`state-update`, layers, Sketch rectangle, asset-click). Prior ArcGIS grind (**G9947â€“G9948**) remains. LiteRT refused. GenieACS OOS.

When the user says "build" without specifying:

1. **G8550 composite** â€” `hub:migration-os-close-smoke`
2. **Migration Chat / AI Assist regression** â€” `hub:migration-chat-smoke`
3. **Multi-origin regression** â€” `hub:multi-origin-lift-close-smoke` Â· `hub:multi-origin-convert-orch-smoke`
4. **WISP regression** â€” `hub:wisp-cwl-map-interact-smoke` Â· `hub:wisp-cwl-arcgis-grind-smoke` Â· remaining/admin smokes Â· `wisp:operator-verify -- --require`
5. **Optional Tier C entry** â€” only after an explicit plan amendment naming Blazor/ERB/Django/Flutter

**Closed program regression:** `hub:wisp-cwl-map-interact-smoke` (**G9949**) Â· `hub:wisp-cwl-arcgis-grind-smoke` (**G9947â€“G9948**) Â· `hub:migration-os-close-smoke` (**G8550**) Â· `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) Â· [`docs/AI-ASSIST.md`](./AI-ASSIST.md) Â· [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) Â· [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) â€” Default queue (superseded 2026-07-13 by D6433 / G9949)

**Amended 2026-07-13 (D6432 / G9947â€“G9948) â€” WISP ArcGIS + grind complete.**

**Status:** **G9947â€“G9948** closed. ArcGIS MapView overlays from `/api/coverage` + `/api/network` geometry; `/api/module-access` + PCI map host grind; mistaken Google key removed from ArcGIS config. LiteRT refused. GenieACS OOS.

When the user says "build" without specifying:

1. **G8550 composite** â€” `hub:migration-os-close-smoke`
2. **Migration Chat / AI Assist regression** â€” `hub:migration-chat-smoke`
3. **Multi-origin regression** â€” `hub:multi-origin-lift-close-smoke` Â· `hub:multi-origin-convert-orch-smoke`
4. **WISP regression** â€” `hub:wisp-cwl-arcgis-grind-smoke` Â· `hub:wisp-cwl-remaining-surface-smoke` Â· admin/ops surface smokes Â· `wisp:operator-verify -- --require`
5. **Optional Tier C entry** â€” only after an explicit plan amendment naming Blazor/ERB/Django/Flutter

**Closed program regression:** `hub:wisp-cwl-arcgis-grind-smoke` (**G9947â€“G9948**) Â· `hub:next-loading-font-smoke` (**G9944**) Â· `hub:angular-ngmodule-providers-smoke` (**G9945**) Â· `hub:vue-app-shell-css-smoke` (**G9946**) Â· `hub:migration-os-close-smoke` (**G8550**) Â· `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) Â· [`docs/AI-ASSIST.md`](./AI-ASSIST.md) Â· [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) Â· [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) â€” Default queue (superseded 2026-07-13 by D6432 / G9947â€“G9948)

**Amended 2026-07-13 (D6429â€“D6431 / G9944â€“G9946) â€” Next loading/font, Angular NgModule, Vue App.vue.**

**Status:** **G9944â€“G9946** closed. Next companion `loading.tsx` + `next/font` honesty holes; Angular `@NgModule` providers edges; Vue `App.vue` shell CSS. Multi-origin close schema **v4**. LiteRT refused. GenieACS OOS.

When the user says "build" without specifying:

1. **G8550 composite** â€” `hub:migration-os-close-smoke`
2. **Migration Chat / AI Assist regression** â€” `hub:migration-chat-smoke`
3. **Multi-origin regression** â€” `hub:multi-origin-lift-close-smoke` Â· `hub:multi-origin-convert-orch-smoke`
4. **WISP regression** â€” `hub:wisp-cwl-remaining-surface-smoke` Â· admin/ops surface smokes Â· `wisp:operator-verify -- --require`
5. **Optional Tier C entry** â€” only after an explicit plan amendment naming Blazor/ERB/Django/Flutter

**Closed program regression:** `hub:next-loading-font-smoke` (**G9944**) Â· `hub:angular-ngmodule-providers-smoke` (**G9945**) Â· `hub:vue-app-shell-css-smoke` (**G9946**) Â· `hub:angular-provided-in-smoke` (**G9941**) Â· `hub:vue-nuxt-layout-css-smoke` (**G9942**) Â· `hub:multi-origin-convert-orch-smoke` (**G9943**) Â· `hub:migration-os-close-smoke` (**G8550**) Â· `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) Â· [`docs/AI-ASSIST.md`](./AI-ASSIST.md) Â· [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) Â· [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) â€” Default queue (superseded 2026-07-13 by D6429â€“D6431 / G9944â€“G9946)

**Amended 2026-07-13 (D6426â€“D6428 / G9941â€“G9943) â€” Angular providedIn, Vue/Nuxt layouts, shared convert orch.**

**Status:** **G9941â€“G9943** closed. Angular `providedIn`/`providers` holes; Vue/Nuxt layout CSS isolation; `convertMultiOriginProjects` proves shared convert-site orchestration (Tier C precondition). Multi-origin close schema **v3**. LiteRT refused. GenieACS OOS.

When the user says "build" without specifying:

1. **G8550 composite** â€” `hub:migration-os-close-smoke`
2. **Migration Chat / AI Assist regression** â€” `hub:migration-chat-smoke`
3. **Multi-origin regression** â€” `hub:multi-origin-lift-close-smoke` Â· `hub:multi-origin-convert-orch-smoke`
4. **WISP regression** â€” `hub:wisp-cwl-remaining-surface-smoke` Â· admin/ops surface smokes Â· `wisp:operator-verify -- --require`
5. **Optional Tier C entry** â€” only after an explicit plan amendment naming Blazor/ERB/Django/Flutter

**Closed program regression:** `hub:angular-provided-in-smoke` (**G9941**) Â· `hub:vue-nuxt-layout-css-smoke` (**G9942**) Â· `hub:multi-origin-convert-orch-smoke` (**G9943**) Â· `hub:next-layout-css-depth-smoke` (**G9940**) Â· `hub:wisp-cwl-remaining-surface-smoke` (**G9932â€“G9939**) Â· `hub:migration-chat-smoke` (**G9921â€“G9923**) Â· `hub:migration-os-close-smoke` (**G8550**) Â· `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) Â· [`docs/AI-ASSIST.md`](./AI-ASSIST.md) Â· [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) Â· [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) â€” Default queue (superseded 2026-07-13 by D6426â€“D6428 / G9941â€“G9943)

**Amended 2026-07-13 (D6425 / G9940) â€” Next layout/globals CSS depth.**

**Status:** **G9940** closed. Ancestor App Router `layout` CSS attributed per route (nested portal isolation); multi-origin close schema **v2**. Prior **G9924â€“G9939** remain closed regression. LiteRT refused. GenieACS OOS.

When the user says "build" without specifying:

1. **G8550 composite** â€” `hub:migration-os-close-smoke`
2. **Migration Chat / AI Assist regression** â€” `hub:migration-chat-smoke`
3. **Multi-origin regression** â€” `hub:multi-origin-lift-close-smoke` Â· `hub:next-layout-css-depth-smoke`
4. **WISP regression** â€” `hub:wisp-cwl-remaining-surface-smoke` Â· admin/ops surface smokes Â· `wisp:operator-verify -- --require`

**Closed program regression:** `hub:next-layout-css-depth-smoke` (**G9940**) Â· `hub:wisp-cwl-remaining-surface-smoke` (**G9932â€“G9939**) Â· `hub:angular-di-graph-smoke` (**G9931**) Â· `hub:next-css-depth-smoke` (**G9930**) Â· `hub:migration-chat-smoke` (**G9921â€“G9923**) Â· `hub:migration-os-close-smoke` (**G8550**) Â· `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) Â· [`docs/AI-ASSIST.md`](./AI-ASSIST.md) Â· [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) Â· [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) â€” Default queue (superseded 2026-07-13 by D6425 / G9940)

**Amended 2026-07-13 (D6424 / G9932â€“G9939) â€” Remaining WISP empty-page hydrate unpaused.**

**Status:** **G9932â€“G9939** closed. Voice/plan/bundles/permissions/roles/CBRS/support structural hydrate shipped; `routes.cwl`/`inferUiPageApiPath` apiPath fixes; empty-list honesty (no invented FCAPS). Pause from **D6416** lifted after multi-origin language POCs. LiteRT refused. GenieACS OOS.

When the user says "build" without specifying:

1. **G8550 composite** â€” `hub:migration-os-close-smoke`
2. **Migration Chat / AI Assist regression** â€” `hub:migration-chat-smoke`
3. **Multi-origin regression** â€” `hub:multi-origin-lift-close-smoke` Â· `hub:angular-di-graph-smoke`
4. **WISP regression** â€” `hub:wisp-cwl-remaining-surface-smoke` Â· admin/ops surface smokes Â· `wisp:operator-verify -- --require`

**Closed program regression:** `hub:wisp-cwl-remaining-surface-smoke` (**G9932â€“G9939**) Â· `hub:angular-di-graph-smoke` (**G9931**) Â· `hub:next-css-depth-smoke` (**G9930**) Â· `hub:vue-scoped-css-depth-smoke` (**G9929**) Â· `hub:migration-chat-smoke` (**G9921â€“G9923**) Â· `hub:migration-os-close-smoke` (**G8550**) Â· `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) Â· [`docs/AI-ASSIST.md`](./AI-ASSIST.md) Â· [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) Â· [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) â€” Default queue (superseded 2026-07-13 by D6424 / G9932â€“G9939)

**Amended 2026-07-13 (D6423 / G9931) â€” Angular DI graph depth.**

**Status:** **G9931** closed. Angular inject graph walks relative service edges; multi-origin close includes DI graph. Tier B Vue/Next/Angular structural+CSS+DI polish closed for this program slice. WISP page-hydrate remains paused. LiteRT refused. GenieACS OOS.

When the user says "build" without specifying:

1. **G8550 composite** â€” `hub:migration-os-close-smoke`
2. **Migration Chat / AI Assist regression** â€” `hub:migration-chat-smoke`
3. **Multi-origin regression** â€” `hub:multi-origin-lift-close-smoke` Â· `hub:angular-di-graph-smoke`
4. **WISP regression only** â€” admin/ops surface smokes + `wisp:operator-verify -- --require` (no new WISP page-hydrate gates unless asked)

**Closed program regression:** `hub:angular-di-graph-smoke` (**G9931**) Â· `hub:next-css-depth-smoke` (**G9930**) Â· `hub:vue-scoped-css-depth-smoke` (**G9929**) Â· `hub:migration-chat-smoke` (**G9921â€“G9923**) Â· `hub:migration-os-close-smoke` (**G8550**) Â· `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) Â· [`docs/AI-ASSIST.md`](./AI-ASSIST.md) Â· [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) Â· [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) â€” Default queue (superseded 2026-07-13 by D6423 / G9931)

**Amended 2026-07-13 (D6422 / G9930) â€” Next App Router CSS depth.**

**Status:** **G9930** closed. Next co-located CSS modules lift without `.next`; multi-origin close includes Next CSS. Prior **G9924â€“G9929** remain closed regression. WISP page-hydrate remains paused. LiteRT refused. GenieACS OOS.

When the user says "build" without specifying:

1. **Multi-origin polish** â€” optional Angular DI graph Â· `hub:multi-origin-lift-close-smoke` Â· `hub:next-css-depth-smoke`
2. **Migration Chat / AI Assist regression** â€” `hub:migration-chat-smoke`
3. **G8550 composite** â€” `hub:migration-os-close-smoke`
4. **WISP regression only** â€” admin/ops surface smokes + `wisp:operator-verify -- --require` (no new WISP page-hydrate gates unless asked)

**Closed program regression:** `hub:next-css-depth-smoke` (**G9930**) Â· `hub:vue-scoped-css-depth-smoke` (**G9929**) Â· `hub:vue-load-bind-smoke` / `hub:next-rsc-depth-smoke` (**G9927â€“G9928**) Â· `hub:migration-chat-smoke` (**G9921â€“G9923**) Â· `hub:migration-os-close-smoke` (**G8550**) Â· `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) Â· [`docs/AI-ASSIST.md`](./AI-ASSIST.md) Â· [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) Â· [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) â€” Default queue (superseded 2026-07-13 by D6422 / G9930)

**Amended 2026-07-12 (D6421 / G9929) â€” Vue scoped-CSS depth.**

**Status:** **G9929** closed. Vue SFC `<style scoped>` lifts without a Vite dist manifest; multi-origin close includes CSS depth. Prior **G9924â€“G9928** remain closed regression. WISP page-hydrate remains paused. LiteRT refused. GenieACS OOS.

When the user says "build" without specifying:

1. **Multi-origin polish** â€” optional Angular DI graph Â· Next CSS adapter Â· `hub:multi-origin-lift-close-smoke` Â· `hub:vue-scoped-css-depth-smoke`
2. **Migration Chat / AI Assist regression** â€” `hub:migration-chat-smoke`
3. **G8550 composite** â€” `hub:migration-os-close-smoke`
4. **WISP regression only** â€” admin/ops surface smokes + `wisp:operator-verify -- --require` (no new WISP page-hydrate gates unless asked)

**Closed program regression:** `hub:vue-scoped-css-depth-smoke` (**G9929**) Â· `hub:vue-load-bind-smoke` / `hub:next-rsc-depth-smoke` (**G9927â€“G9928**) Â· `hub:angular-structural-shell-depth-smoke` (**G9926**) Â· `hub:migration-chat-smoke` (**G9921â€“G9923**) Â· `hub:migration-os-close-smoke` (**G8550**) Â· `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) Â· [`docs/AI-ASSIST.md`](./AI-ASSIST.md) Â· [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) Â· [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) â€” Default queue (superseded 2026-07-12 by D6421 / G9929)

**Amended 2026-07-12 (D6420 / G9927â€“G9928) â€” Vue load-bind + Next RSC depth.**

**Status:** **G9927â€“G9928** closed. Shared load-bind hydrates Vue/Next/Angular structural markers; Next async RSC fixture proven. Prior **G9924â€“G9926** remain closed regression. WISP page-hydrate remains paused. LiteRT refused. GenieACS OOS.

When the user says "build" without specifying:

1. **Multi-origin polish** â€” Vue scoped-CSS depth Â· optional Angular DI graph Â· `hub:multi-origin-lift-close-smoke` Â· `hub:vue-load-bind-smoke` Â· `hub:next-rsc-depth-smoke`
2. **Migration Chat / AI Assist regression** â€” `hub:migration-chat-smoke`
3. **G8550 composite** â€” `hub:migration-os-close-smoke`
4. **WISP regression only** â€” admin/ops surface smokes + `wisp:operator-verify -- --require` (no new WISP page-hydrate gates unless asked)

**Closed program regression:** `hub:vue-load-bind-smoke` / `hub:next-rsc-depth-smoke` (**G9927â€“G9928**) Â· `hub:angular-structural-shell-depth-smoke` (**G9926**) Â· `hub:vue-structural-shell-depth-smoke` / `hub:next-structural-shell-depth-smoke` (**G9924â€“G9925**) Â· `hub:migration-chat-smoke` (**G9921â€“G9923**) Â· `hub:migration-os-close-smoke` (**G8550**) Â· `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) Â· [`docs/AI-ASSIST.md`](./AI-ASSIST.md) Â· [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) Â· [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) â€” Default queue (superseded 2026-07-12 by D6420 / G9927â€“G9928)

**Amended 2026-07-12 (D6419 / G9926) â€” Angular structural-shell depth.**

**Status:** **G9926** closed (after **G9924â€“G9925**). Vue/Next/Angular structural-shell emit named holes (template + Angular DI); depth smokes folded into `hub:multi-origin-lift-close-smoke`. WISP page-hydrate remains paused. LiteRT refused. GenieACS OOS.

When the user says "build" without specifying:

1. **Multi-origin depth** â€” Vue load-bind / Next deeper RSC Â· optional Tier B polish Â· `hub:multi-origin-lift-close-smoke` Â· depth smokes
2. **Migration Chat / AI Assist regression** â€” `hub:migration-chat-smoke`
3. **G8550 composite** â€” `hub:migration-os-close-smoke`
4. **WISP regression only** â€” admin/ops surface smokes + `wisp:operator-verify -- --require` (no new WISP page-hydrate gates unless asked)

**Closed program regression:** `hub:angular-structural-shell-depth-smoke` (**G9926**) Â· `hub:vue-structural-shell-depth-smoke` / `hub:next-structural-shell-depth-smoke` (**G9924â€“G9925**) Â· `hub:migration-chat-smoke` (**G9921â€“G9923**) Â· `hub:wisp-cwl-admin-surface-smoke` (**G9917â€“G9920**) Â· `hub:migration-os-close-smoke` (**G8550**) Â· `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) Â· [`docs/AI-ASSIST.md`](./AI-ASSIST.md) Â· [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) Â· [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) â€” Default queue (superseded 2026-07-12 by D6419 / G9926)

**Amended 2026-07-12 (D6418 / G9924â€“G9925) â€” Vue/Next structural-shell depth.**

**Status:** **G9924â€“G9925** closed. Vue/Next structural-shell emit named holes (no silent strip); depth smokes folded into `hub:multi-origin-lift-close-smoke`. Prior **G9921â€“G9923** Migration Chat remains closed regression. WISP page-hydrate remains paused. LiteRT refused. GenieACS OOS.

When the user says "build" without specifying:

1. **Multi-origin depth** â€” Angular DI / service holes Â· further Vue load-bind / Next RSC depth Â· `hub:multi-origin-lift-close-smoke` Â· `hub:vue-structural-shell-depth-smoke` Â· `hub:next-structural-shell-depth-smoke`
2. **Migration Chat / AI Assist regression** â€” `hub:migration-chat-smoke`
3. **G8550 composite** â€” `hub:migration-os-close-smoke`
4. **WISP regression only** â€” admin/ops surface smokes + `wisp:operator-verify -- --require` (no new WISP page-hydrate gates unless asked)

**Closed program regression:** `hub:vue-structural-shell-depth-smoke` / `hub:next-structural-shell-depth-smoke` (**G9924â€“G9925**) Â· `hub:migration-chat-smoke` (**G9921â€“G9923**) Â· `hub:wisp-cwl-admin-surface-smoke` (**G9917â€“G9920**) Â· `hub:wisp-cwl-ops-surface-smoke` (**G9913â€“G9916**) Â· `hub:migration-os-close-smoke` (**G8550**) Â· `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md) Â· [`docs/AI-ASSIST.md`](./AI-ASSIST.md) Â· [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) Â· [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) â€” Default queue (superseded 2026-07-12 by D6418 / G9924â€“G9925)

**Amended 2026-07-12 (D6417 / G9921â€“G9923) â€” Migration Chat + AI Assist; LiteRT refused.**

**Status:** **G9921â€“G9923** closed. Interactive/scripted Migration Chat (CLI + hub), AI Assist packaging (`docs/AI-ASSIST.md`, MCP example, `/api/config.aiAssist`). **Refused:** LiteRT.js as convert/runtime substrate. WISP page-hydrate remains paused. GenieACS OOS.

When the user says "build" without specifying:

1. **Migration Chat / AI Assist regression** â€” `hub:migration-chat-smoke`
2. **Multi-origin / language substrates** â€” `hub:multi-origin-lift-close-smoke` Â· Next/Vue/Angular structural smokes (expand origins that lack a WISP-scale POC)
3. **G8550 composite** â€” `hub:migration-os-close-smoke`
4. **WISP regression only** â€” admin/ops surface smokes + `wisp:operator-verify -- --require` (no new WISP page-hydrate gates unless asked)

**Closed program regression:** `hub:migration-chat-smoke` (**G9921â€“G9923**) Â· `hub:wisp-cwl-admin-surface-smoke` (**G9917â€“G9920**) Â· `hub:wisp-cwl-ops-surface-smoke` (**G9913â€“G9916**) Â· `hub:migration-os-close-smoke` (**G8550**) Â· `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/AI-ASSIST.md`](./AI-ASSIST.md) Â· [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) Â· [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md) Â· [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md)

---

## 12 (archived) â€” Default queue (superseded 2026-07-12 by D6417 / G9921â€“G9923)

**Amended 2026-07-12 (D6416 / G9917â€“G9920) â€” Admin surface closed; WISP page-hydrate grind paused.**

**Status:** **G9917â€“G9920** closed. Users/tenants/monitoring/HSS/deploy hydrate + catalog/scrub shipped. **Paused:** further WISP empty-module hydrate â€” diminishing returns without non-WISP language POCs. Prior **G9900â€“G9916** remain closed regression. GenieACS OOS.

When the user says "build" without specifying:

1. **Multi-origin / language substrates** â€” `hub:multi-origin-lift-close-smoke` Â· `hub:next-structural-shell-smoke` Â· `hub:vue-structural-shell-smoke` Â· `hub:angular-structural-shell-smoke` (expand origins that lack a WISP-scale POC)
2. **G8550 composite** â€” `hub:migration-os-close-smoke`
3. **WISP regression only** â€” `hub:wisp-cwl-admin-surface-smoke` Â· `hub:wisp-cwl-ops-surface-smoke` Â· `pnpm run wisp:operator-verify -- --require` (do **not** start new WISP page-hydrate gates unless explicitly requested)
4. **Operator GPU / census** â€” `gpu-lab:gce` Â· `hub:extended-matrix-oracle-progress-smoke`

**Closed program regression:** `hub:wisp-cwl-admin-surface-smoke` (**G9917â€“G9920**) Â· `hub:wisp-cwl-ops-surface-smoke` (**G9913â€“G9916**) Â· `hub:wisp-cwl-route-depth-smoke` (**G9910â€“G9912**) Â· `hub:wisp-cwl-all-shells-smoke` (**G9909**) Â· `hub:migration-os-close-smoke` (**G8550**) Â· `hub:whole-site-cwl-close-smoke` (**G9450**) Â· `hub:multi-origin-lift-close-smoke` (**G9880**)

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) Â· [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md) Â· [`docs/MULTI-ORIGIN-LIFT-EXPANSION.md`](./MULTI-ORIGIN-LIFT-EXPANSION.md)

---

## 12 (archived) â€” Default queue (superseded 2026-07-12 by D6416 / G9917â€“G9920)

**Amended 2026-07-12 (D6415 / G9913â€“G9916) â€” Ops/billing showcase surface.**

**Status:** **G9913â€“G9916** closed. Help-desk/maintain + billing hydrate; residual `svelte:*`/`\r`/mojibake scrub; live `/api/maintain` + `/api/customer-billing` contract. Prior **G9900â€“G9912** remain closed. GenieACS OOS.

When the user says "build" without specifying:

1. **Ops surface** â€” `hub:wisp-cwl-ops-surface-smoke` then `pnpm run wisp:deploy:gce`
2. **Route depth** â€” `hub:wisp-cwl-route-depth-smoke`
3. **All shells** â€” `hub:wisp-cwl-all-shells-smoke`
4. **Showcase depth** â€” `hub:wisp-cwl-showcase-depth-smoke`
5. **Island live hydrate** â€” `hub:wisp-cwl-island-live-hydrate-smoke`
6. **Operator verify** â€” `pnpm run wisp:operator-verify -- --require`
7. **G8550 / regression** â€” `hub:migration-os-close-smoke` Â· `hub:wisp-cwl-visual-depth-smoke` Â· `hub:multi-origin-lift-close-smoke`

**Closed program regression:** `hub:wisp-cwl-ops-surface-smoke` (**G9913â€“G9916**) Â· `hub:wisp-cwl-route-depth-smoke` (**G9910â€“G9912**) Â· `hub:wisp-cwl-all-shells-smoke` (**G9909**) Â· `hub:wisp-cwl-showcase-depth-smoke` (**G9905â€“G9908**) Â· `hub:wisp-cwl-markup-artifact-smoke` (**G9904**) Â· `hub:wisp-cwl-shell-island-smoke` (**G9903**) Â· `hub:wisp-cwl-island-live-hydrate-smoke` (**G9902**) Â· `hub:migration-os-close-smoke` (**G8550**) Â· `hub:whole-site-cwl-close-smoke` (**G9450**)

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) Â· [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) â€” Default queue (superseded 2026-07-12 by D6415 / G9913â€“G9916)

**Amended 2026-07-12 (D6414 / G9910â€“G9912) â€” Showcase route depth.**

**Status:** **G9910â€“G9912** closed. Dashboard module cards from known CWL routes + `/api/admin`; SVG `<//modules/>` scrub; sites â†’ `/api/network` + work-orders structural hydrate. Prior **G9900â€“G9909** remain closed. GenieACS OOS.

When the user says "build" without specifying:

1. **Route depth** â€” `hub:wisp-cwl-route-depth-smoke` then `pnpm run wisp:deploy:gce`
2. **All shells** â€” `hub:wisp-cwl-all-shells-smoke`
3. **Showcase depth** â€” `hub:wisp-cwl-showcase-depth-smoke`
4. **Island live hydrate** â€” `hub:wisp-cwl-island-live-hydrate-smoke`
5. **Operator verify** â€” `pnpm run wisp:operator-verify -- --require`
6. **G8550 / regression** â€” `hub:migration-os-close-smoke` Â· `hub:wisp-cwl-visual-depth-smoke` Â· `hub:multi-origin-lift-close-smoke`

**Closed program regression:** `hub:wisp-cwl-route-depth-smoke` (**G9910â€“G9912**) Â· `hub:wisp-cwl-all-shells-smoke` (**G9909**) Â· `hub:wisp-cwl-showcase-depth-smoke` (**G9905â€“G9908**) Â· `hub:wisp-cwl-markup-artifact-smoke` (**G9904**) Â· `hub:wisp-cwl-shell-island-smoke` (**G9903**) Â· `hub:wisp-cwl-island-live-hydrate-smoke` (**G9902**) Â· `hub:migration-os-close-smoke` (**G8550**) Â· `hub:whole-site-cwl-close-smoke` (**G9450**)

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) Â· [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) â€” Default queue (maintenance, superseded 2026-07-12 by D6413 / G9909)

**Amended 2026-07-12 (D6413 / G9909) â€” Convert all CWL shells at once.**

**Status:** **G9909** closed. All six shell kinds (modal/map/chart/wizard/nav/widget) become honest island chrome in one client pass. Prior **G9900â€“G9908** remain closed. GenieACS OOS.

When the user says "build" without specifying:

1. **All shells** â€” `hub:wisp-cwl-all-shells-smoke` then `pnpm run wisp:deploy:gce`
2. **Showcase depth** â€” `hub:wisp-cwl-showcase-depth-smoke`
3. **Island live hydrate** â€” `hub:wisp-cwl-island-live-hydrate-smoke`
4. **Operator verify** â€” `pnpm run wisp:operator-verify -- --require`
5. **G8550 / regression** â€” `hub:migration-os-close-smoke` Â· `hub:wisp-cwl-visual-depth-smoke` Â· `hub:multi-origin-lift-close-smoke`

**Closed program regression:** `hub:wisp-cwl-all-shells-smoke` (**G9909**) Â· `hub:wisp-cwl-showcase-depth-smoke` (**G9905â€“G9908**) Â· `hub:wisp-cwl-markup-artifact-smoke` (**G9904**) Â· `hub:wisp-cwl-shell-island-smoke` (**G9903**) Â· `hub:wisp-cwl-island-live-hydrate-smoke` (**G9902**) Â· `hub:migration-os-close-smoke` (**G8550**) Â· `hub:whole-site-cwl-close-smoke` (**G9450**)

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md) Â· [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md)

---

## 12 (archived) â€” Default queue (maintenance, superseded 2026-07-12 by D6405 / G9840)

**Post D6401 close (2026-07-11) â€” WISP fill-all holes shipped.**

**Status:** **G9800** closed (**D6401**); **G8550** schema **v22**; WISP markup holes **0**; empty `/add` form shells; GenieACS OOS.

When the user says "build" without specifying:

1. **G8550 composite** â€” `pnpm run hub:migration-os-close-smoke` (schema **v22**)
2. **Operator GPU train** â€” `pnpm run gpu-lab:gce` with `CHRYSALIS_GPU_LAB_DRY_RUN=0` (T4; LoRA `messages[]` mapping; **G9820** fetch adapter + honest `gpu-lab:gce:status`)
3. **Extended matrix census** â€” `hub:extended-matrix-oracle-progress-smoke` (**G9160**)
4. **Whole-site CWL regression** â€” `pnpm run hub:whole-site-cwl-close-smoke` (**G9450**)
5. **WISP regression** â€” `hub:wisp-fill-holes-smoke` / `hub:wisp-showcase-bound-smoke` (zero-hole bound) + `hub:wisp-cwl-routes-integrity-smoke` (**G9830**); GenieACS never in scope

**Product sample READY:** â‰¥ **50** live-analytics jobs (`PRODUCT_HIT_RATE_MIN_JOBS`) â€” may include seed.  
**Live hit-rate READY:** â‰¥ **50** `hub-convert-verify` jobs (`PRODUCT_HIT_RATE_LIVE_MIN_JOBS`) â€” via `web-llm:batch-hub-convert-verify-evidence`.  
**Salience v2 production:** auto when `reports/web-llm/operator-evidence/` has â‰¥ **20** domain folders.  
**Public dashboard:** `/reports/web-llm/operator-evidence/poc/` on the operator hub.

**Closed program regression:** `hub:migration-os-close-smoke` (**G8550** / **D6401**) Â· `hub:wisp-fill-holes-smoke` (**G9800**) Â· `hub:wisp-showcase-bound-smoke` (**G9610**) Â· `hub:product-hit-rate-live-ready-smoke` (**G9770**) Â· `hub:product-hit-rate-live-smoke` (**G9760**) Â· `hub:product-hit-rate-sample-smoke` (**G9670**) Â· `hub:public-reports-smoke` (**G9700**)

**CynoEngine collab:** [`CYNO-CHRYSALIS-COLLAB.md`](./CYNO-CHRYSALIS-COLLAB.md) Â· strategic plan: [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) Â· [CynoEngine#1](https://github.com/nimbus7772017/CynoEngine/issues/1)

**Operator demo:** `pnpm run migration-evidence:demo`  
**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

---

## 12 (archived) â€” Default queue (maintenance, superseded 2026-07-11 by D6401 / G9800)

**Post D6400 close (2026-07-11) â€” WISP /add form shells + opaque settle shipped.**

**Status:** **G9790** closed (**D6400**); **G8550** schema **v21**; no-source `/add` â†’ empty form shells; residual opaque calls remain intentional; GenieACS OOS.

When the user says "build" without specifying:

1. **G8550 composite** â€” `pnpm run hub:migration-os-close-smoke` (schema **v21**)
2. **Operator GPU train** â€” `pnpm run gpu-lab:gce` with `CHRYSALIS_GPU_LAB_DRY_RUN=0` (T4; LoRA `messages[]` mapping)
3. **Extended matrix census** â€” `hub:extended-matrix-oracle-progress-smoke` (**G9160**)
4. **Whole-site CWL regression** â€” `pnpm run hub:whole-site-cwl-close-smoke` (**G9450**)
5. **WISP intentional floor** â€” opaque `reduce`/`filter`/`JSON.stringify`/handlers (no invented business fields); GenieACS never in scope

**Product sample READY:** â‰¥ **50** live-analytics jobs (`PRODUCT_HIT_RATE_MIN_JOBS`) â€” may include seed.  
**Live hit-rate READY:** â‰¥ **50** `hub-convert-verify` jobs (`PRODUCT_HIT_RATE_LIVE_MIN_JOBS`) â€” via `web-llm:batch-hub-convert-verify-evidence`.  
**Salience v2 production:** auto when `reports/web-llm/operator-evidence/` has â‰¥ **20** domain folders.  
**Public dashboard:** `/reports/web-llm/operator-evidence/poc/` on the operator hub.

**Closed program regression:** `hub:migration-os-close-smoke` (**G8550** / **D6400**) Â· `hub:wisp-fill-holes-smoke` (**G9790**) Â· `hub:wisp-showcase-bound-smoke` (**G9610**) Â· `hub:product-hit-rate-live-ready-smoke` (**G9770**) Â· `hub:product-hit-rate-live-smoke` (**G9760**) Â· `hub:product-hit-rate-sample-smoke` (**G9670**) Â· `hub:public-reports-smoke` (**G9700**)

**CynoEngine collab:** [`CYNO-CHRYSALIS-COLLAB.md`](./CYNO-CHRYSALIS-COLLAB.md) Â· strategic plan: [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) Â· [CynoEngine#1](https://github.com/nimbus7772017/CynoEngine/issues/1)

**Operator demo:** `pnpm run migration-evidence:demo`  
**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

---

## 12 (archived) â€” Default queue (maintenance, superseded 2026-07-11 by D6400 / G9790)

**Post D6399 close (2026-07-11) â€” WISP residual settle shipped.**

**Status:** **G9780** closed (**D6399**); **G8550** schema **v20**; residual WISP holes **~517** (39 no-source floor).

When the user says "build" without specifying:

1. **G8550 composite** â€” `pnpm run hub:migration-os-close-smoke` (schema **v20**)
2. **Operator GPU train** â€” `pnpm run gpu-lab:gce` with `CHRYSALIS_GPU_LAB_DRY_RUN=0` (T4; LoRA `messages[]` mapping)
3. **Extended matrix census** â€” `hub:extended-matrix-oracle-progress-smoke` (**G9160**)
4. **Whole-site CWL regression** â€” `pnpm run hub:whole-site-cwl-close-smoke` (**G9450**)
5. **WISP intentional floor** â€” opaque calls + **39** no-source `/add` (no invented forms); live production traces when available

**Product sample READY:** â‰¥ **50** live-analytics jobs (`PRODUCT_HIT_RATE_MIN_JOBS`) â€” may include seed.  
**Live hit-rate READY:** â‰¥ **50** `hub-convert-verify` jobs (`PRODUCT_HIT_RATE_LIVE_MIN_JOBS`) â€” via `web-llm:batch-hub-convert-verify-evidence`.  
**Salience v2 production:** auto when `reports/web-llm/operator-evidence/` has â‰¥ **20** domain folders.  
**Public dashboard:** `/reports/web-llm/operator-evidence/poc/` on the operator hub.

**Closed program regression:** `hub:migration-os-close-smoke` (**G8550** / **D6399**) Â· `hub:wisp-fill-holes-smoke` (**G9780**) Â· `hub:wisp-showcase-bound-smoke` (**G9610**) Â· `hub:product-hit-rate-live-ready-smoke` (**G9770**) Â· `hub:product-hit-rate-live-smoke` (**G9760**) Â· `hub:product-hit-rate-sample-smoke` (**G9670**) Â· `hub:public-reports-smoke` (**G9700**)

**CynoEngine collab:** [`CYNO-CHRYSALIS-COLLAB.md`](./CYNO-CHRYSALIS-COLLAB.md) Â· strategic plan: [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) Â· [CynoEngine#1](https://github.com/nimbus7772017/CynoEngine/issues/1)

**Operator demo:** `pnpm run migration-evidence:demo`  
**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

---

## 12 (archived) â€” Default queue (maintenance, superseded 2026-07-11 by D6399 / G9780)

**Post D6398 close (2026-07-11) â€” live hit-rate READY accumulator shipped.**

**Status:** **G9770** closed (**D6398**); **G8550** schema **v19**; residual WISP holes **~564**.

When the user says "build" without specifying:

1. **G8550 composite** â€” `pnpm run hub:migration-os-close-smoke` (schema **v19**)
2. **Operator GPU train** â€” `pnpm run gpu-lab:gce` with `CHRYSALIS_GPU_LAB_DRY_RUN=0` (T4; LoRA `messages[]` mapping)
3. **Extended matrix census** â€” `hub:extended-matrix-oracle-progress-smoke` (**G9160**)
4. **Whole-site CWL regression** â€” `pnpm run hub:whole-site-cwl-close-smoke` (**G9450**)
5. **WISP residual** â€” complex calls + 39 no-source `/add` (no invented forms); live production traces when available

**Product sample READY:** â‰¥ **50** live-analytics jobs (`PRODUCT_HIT_RATE_MIN_JOBS`) â€” may include seed.  
**Live hit-rate READY:** â‰¥ **50** `hub-convert-verify` jobs (`PRODUCT_HIT_RATE_LIVE_MIN_JOBS`) â€” via `web-llm:batch-hub-convert-verify-evidence`.  
**Salience v2 production:** auto when `reports/web-llm/operator-evidence/` has â‰¥ **20** domain folders.  
**Public dashboard:** `/reports/web-llm/operator-evidence/poc/` on the operator hub.

**Closed program regression:** `hub:migration-os-close-smoke` (**G8550** / **D6398**) Â· `hub:product-hit-rate-live-ready-smoke` (**G9770**) Â· `hub:product-hit-rate-live-smoke` (**G9760**) Â· `hub:wisp-fill-holes-smoke` (**G9750**) Â· `hub:wisp-showcase-bound-smoke` (**G9610**) Â· `hub:product-hit-rate-sample-smoke` (**G9670**) Â· `hub:public-reports-smoke` (**G9700**)

**CynoEngine collab:** [`CYNO-CHRYSALIS-COLLAB.md`](./CYNO-CHRYSALIS-COLLAB.md) Â· strategic plan: [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) Â· [CynoEngine#1](https://github.com/nimbus7772017/CynoEngine/issues/1)

**Operator demo:** `pnpm run migration-evidence:demo`  
**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

---

## 12 (archived) â€” Default queue (maintenance, superseded 2026-07-11 by D6398 / G9770)

**Post D6397 close (2026-07-11) â€” live hit-rate provenance shipped.**

**Status:** **G9760** closed (**D6397**); **G8550** schema **v18**; residual WISP holes **~564**.

When the user says "build" without specifying:

1. **G8550 composite** â€” `pnpm run hub:migration-os-close-smoke` (schema **v18**)
2. **Operator GPU train** â€” `pnpm run gpu-lab:gce` (T4; prep **G9620**; LoRA `messages[]` mapping fixed)
3. **Extended matrix census** â€” `hub:extended-matrix-oracle-progress-smoke` (**G9160**)
4. **Whole-site CWL regression** â€” `pnpm run hub:whole-site-cwl-close-smoke` (**G9450**)
5. **WISP residual** â€” complex calls + 39 no-source `/add` (no invented forms); live production traces when available
6. **Accumulate live verify jobs** â€” hub-convert verify outcomes toward `productHitRateLiveReady` (â‰¥50)

**Product sample READY:** â‰¥ **50** live-analytics jobs (`PRODUCT_HIT_RATE_MIN_JOBS`) â€” may include seed.  
**Live hit-rate READY:** â‰¥ **50** `hub-convert-verify` jobs (`PRODUCT_HIT_RATE_LIVE_MIN_JOBS`) â€” seed does not count.  
**Salience v2 production:** auto when `reports/web-llm/operator-evidence/` has â‰¥ **20** domain folders.  
**Public dashboard:** `/reports/web-llm/operator-evidence/poc/` on the operator hub.

**Closed program regression:** `hub:migration-os-close-smoke` (**G8550** / **D6397**) Â· `hub:product-hit-rate-live-smoke` (**G9760**) Â· `hub:wisp-fill-holes-smoke` (**G9750**) Â· `hub:wisp-showcase-bound-smoke` (**G9610**) Â· `hub:product-hit-rate-sample-smoke` (**G9670**) Â· `hub:public-reports-smoke` (**G9700**)

**CynoEngine collab:** [`CYNO-CHRYSALIS-COLLAB.md`](./CYNO-CHRYSALIS-COLLAB.md) Â· strategic plan: [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) Â· [CynoEngine#1](https://github.com/nimbus7772017/CynoEngine/issues/1)

**Operator demo:** `pnpm run migration-evidence:demo`  
**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

---

## 12 (archived) â€” Default queue (maintenance, superseded 2026-07-11 by D6397 / G9760)

**Post D6394 close (2026-07-10) â€” enriched traces + Object.entries/ternary/$store shipped.**

**Status:** **G9750** closed (**D6394**); **G8550** schema **v17**; residual WISP holes **~564**.

When the user says "build" without specifying:

1. **G8550 composite** â€” `pnpm run hub:migration-os-close-smoke` (schema **v17**)
2. **Operator GPU train** â€” `pnpm run gpu-lab:gce` (T4; prep **G9620**)
3. **Extended matrix census** â€” `hub:extended-matrix-oracle-progress-smoke` (**G9160**)
4. **Whole-site CWL regression** â€” `pnpm run hub:whole-site-cwl-close-smoke` (**G9450**)
5. **WISP residual** â€” complex calls + 39 no-source `/add` (no invented forms); live production traces when available
6. **Real operator hit-rate** â€” replace seeded trajectories with live hub-convert verify outcomes

**Product sample READY:** â‰¥ **50** live-analytics jobs (`PRODUCT_HIT_RATE_MIN_JOBS`).  
**Salience v2 production:** auto when `reports/web-llm/operator-evidence/` has â‰¥ **20** domain folders.  
**Public dashboard:** `/reports/web-llm/operator-evidence/poc/` on the operator hub.

**Closed program regression:** `hub:migration-os-close-smoke` (**G8550** / **D6394**) Â· `hub:wisp-fill-holes-smoke` (**G9750**) Â· `hub:wisp-showcase-bound-smoke` (**G9610**) Â· `hub:product-hit-rate-sample-smoke` (**G9670**) Â· `hub:public-reports-smoke` (**G9700**)

**CynoEngine collab:** [`CYNO-CHRYSALIS-COLLAB.md`](./CYNO-CHRYSALIS-COLLAB.md) Â· strategic plan: [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) Â· [CynoEngine#1](https://github.com/nimbus7772017/CynoEngine/issues/1)

**Operator demo:** `pnpm run migration-evidence:demo`  
**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

---

## 12 (archived) â€” Default queue (maintenance, superseded 2026-07-09 by D6377 / G9560â€“G9590)

**Post G9510 close (2026-07-09).**

**Status:** **G9510 closed** (**D6372** â€” IS live analytics); **G9400 closed** (**G9450**, **D6366** â€” 2026-07-09); Phase 46 closed (**G9290**); UI asset/markup adapters closed (**G9300â€“G9309**); **Migration OS closed** (**G8550**).

When the user says "build" without specifying:

1. **G8550 composite** â€” `pnpm run hub:migration-os-close-smoke`
2. **G8570 Open Legacy wedge** â€” `pnpm run hub:site-port-open-legacy-wedge-smoke`
3. **G6731 CWL language maintenance** â€” `pnpm run hub:cwl-language-maintenance-smoke` (weekly CI)
4. **Extended matrix census** â€” `hub:extended-matrix-oracle-progress-smoke` (**G9160**)
5. **Whole-site CWL regression** â€” `pnpm run hub:whole-site-cwl-close-smoke` (**G9450**)
6. **Structural-shell markup** â€” `pnpm run hub:ui-markup-lift-smoke` (**G9460** / **D6367**)
7. **Document-shell CSS** â€” `pnpm run hub:whole-site-cwl-close-smoke` (**G9470** / **D6368**)
8. **WISP whole-site finish** â€” `pnpm run hub:wisp-whole-site-finish-smoke` (**G9480** / **D6369**; needs WISP root)
9. **WISP remaining holes** â€” `pnpm run hub:wisp-remaining-holes-finish-smoke` (**G9490** / **D6370**; needs WISP root; GenieACS out of scope)
10. **Fill fillable holes** â€” `pnpm run hub:wisp-fill-holes-smoke` (**G9500** / **D6371**; needs WISP root)
11. **IS live analytics** â€” `pnpm run hub:is-live-analytics-close-smoke` (**G9510** / **D6372**)

**Closed program regression:** `hub:whole-site-cwl-close-smoke` (**G9450** / **G9470**) Â· `hub:ui-markup-lift-smoke` (**G9460**) Â· `hub:wisp-whole-site-finish-smoke` (**G9480**) Â· `hub:wisp-remaining-holes-finish-smoke` (**G9490**) Â· `hub:wisp-fill-holes-smoke` (**G9500**) Â· `hub:is-live-analytics-close-smoke` (**G9510**) Â· `hub:phase46-program-close-smoke` (**G9290**) Â· `hub:phase45-program-close-smoke` (**G9190**)

**WISP showcase:** `hub:phase45-wisp-showcase-smoke` (**G9170**); visual parity `hub:wisp-cwl-ui-parity-close-smoke` (**G8100**) remains showcase-only; finish `hub:wisp-whole-site-finish-smoke` (**G9480**) Â· `hub:wisp-remaining-holes-finish-smoke` (**G9490**) Â· `hub:wisp-fill-holes-smoke` (**G9500**)

**Operator demo:** `pnpm run migration-evidence:demo`  
**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

---

## 12 (archived) â€” Default queue (whole-site CWL conversion â€” G9400, superseded 2026-07-09 by G9450 close)

**Post G9309 close; G9400 activated 2026-07-09.**

**Status:** **G9400 active** (**D6366**); Phase 46 closed (**G9290**); UI asset/markup adapters closed (**G9300â€“G9309**). **Proof is last**.

When the user said "build" without specifying:

1. **G9420** â€” `pnpm run hub:site-convert-smoke`
2. **G9410** â€” `pnpm run hub:wisp-package-ui-lift-smoke`
3. **G9430** â€” `pnpm run hub:site-load-bind-smoke`
4. **G9440** â€” `pnpm run hub:site-scale-matrix-smoke`
5. **G9450** â€” `pnpm run hub:whole-site-cwl-close-smoke`

**Program doc:** [`docs/WHOLE-SITE-CWL-CONVERSION.md`](./WHOLE-SITE-CWL-CONVERSION.md)

---

## 12 (archived) â€” Default queue (maintenance, superseded 2026-07-09 by G9400)

**Post Phase 46 close (2026-07-06).**

**Status:** **Phase 46 closed** (**G9290**, **D6343** â€” 2026-07-06); **Phase 45 closed** (**G9190**); **Migration OS closed** (**G8550**); **G7200** IR helper closed; **WISP showcase in default CI** (**G9170**).

When the user says "build" without specifying:

1. **G8550 composite** â€” `pnpm run hub:migration-os-close-smoke`
2. **G8570 Open Legacy wedge** â€” `pnpm run hub:site-port-open-legacy-wedge-smoke`
3. **G6731 CWL language maintenance** â€” `pnpm run hub:cwl-language-maintenance-smoke` (weekly CI)
4. **Extended matrix census** â€” `hub:extended-matrix-oracle-progress-smoke` (**G9160**) â€” **601/601** oracle-product (baseline **0** below target); waves **8â€“16** (**G9161** / **G9163** / **G9164** / **G9165** / **G9166** / **G9167** / **G9168** / **G9169** / **G9172**)
5. **CWL runtime scaffold depth** â€” `hub:cwl-runtime-scaffold-depth-smoke` (**G9238**) â€” browser island binding + worker fetch delegate

**WISP showcase (default CI):** `hub:phase45-wisp-showcase-smoke` (**G9170**)

**Closed program regression:** `hub:phase46-program-close-smoke` (**G9290**) Â· `hub:phase45-program-close-smoke` (**G9190**) Â· `hub:phase44-program-close-smoke` (**G9140**) Â· `hub:ir-helper-program-close-smoke` (**G7200**)

**Operator demo:** `pnpm run migration-evidence:demo`  
**GCE Migration OS:** `pnpm run test:gce:migration-os`  
**GCE maintenance:** `pnpm run test:gce:maintenance`  
**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

---

## 12 (archived) â€” Default queue (Phase 46 active, superseded 2026-07-06)

> **Historical snapshot** â€” census counts below are close-time only. Active baseline: **601/601** (**G9160**, **D6357**). See active Â§12 above.

**Post Phase 45 close; Phase 46 activated 2026-07-06.**

**Status:** **Phase 46 active** (**G9250**, **D6341** â€” 2026-07-06); **Phase 45 closed** (**G9190**); **Migration OS closed** (**G8550**); **G7200** IR helper closed.

When the user says "build" without specifying:

1. **G9280 build slice** â€” `pnpm run hub:phase46-build-slice-smoke`
2. **G9275 / G9285** â€” `hub:extended-matrix-oracle-wave6-smoke` Â· `hub:extended-matrix-oracle-wave7-smoke`
3. **G9210 runtime depth** â€” `pnpm run hub:phase46-cwl-runtime-depth-smoke`
4. **G8550 / G8570 maintenance** â€” after each track merge
5. **G9160 census** â€” `hub:extended-matrix-oracle-progress-smoke` â€” **423** pairs below oracle-product (baseline **178/601**)

**WISP showcase (default CI):** `hub:phase45-wisp-showcase-smoke` (**G9170**)

**Closed program regression:** `hub:phase45-program-close-smoke` (**G9190**) Â· `hub:phase44-program-close-smoke` (**G9140**) Â· `hub:ir-helper-program-close-smoke` (**G7200**)

**Program close (in progress):** `hub:phase46-program-close-smoke` (**G9290**)

**Operator demo:** `pnpm run migration-evidence:demo`  
**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

---

## 12 (archived) â€” Default queue (maintenance, superseded 2026-07-06 by Phase 46)

> **Historical snapshot** â€” census counts below are close-time only. Active baseline: **601/601** (**G9160**, **D6357**). See active Â§12 above.

**Post Phase 45 close (2026-07-06).**

**Status:** **Phase 45 closed** (**G9190**, **D6340** â€” 2026-07-06); **Phase 44 closed** (**G9140**); **Migration OS closed** (**G8550**); **G7200** IR helper closed; **WISP showcase in default CI** (**G9170**).

When the user says "build" without specifying:

1. **G8550 composite** â€” `pnpm run hub:migration-os-close-smoke`
2. **G8570 Open Legacy wedge** â€” `pnpm run hub:site-port-open-legacy-wedge-smoke`
3. **G6731 CWL language maintenance** â€” `pnpm run hub:cwl-language-maintenance-smoke`
4. **Extended matrix census** â€” `hub:extended-matrix-oracle-progress-smoke` (**G9160**) â€” **423** pairs below oracle-product

**WISP showcase (default CI):** `hub:phase45-wisp-showcase-smoke` (**G9170**)

**Closed program regression:** `hub:phase45-program-close-smoke` (**G9190**) Â· `hub:phase44-program-close-smoke` (**G9140**) Â· `hub:ir-helper-program-close-smoke` (**G7200**)

**Operator demo:** `pnpm run migration-evidence:demo`  
**GCE Migration OS:** `pnpm run test:gce:migration-os`  
**GCE maintenance:** `pnpm run test:gce:maintenance`  
**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

---

## 12 (archived) â€” Default queue (Phase 45 active, superseded 2026-07-06)

**Post Phase 44 close (2026-07-04).**

**Status:** **Phase 44 closed** (**G9140**, **D6311** â€” 2026-07-04); **Phase 43 closed** (**G8940**, **D6303**); **Phase 41 closed** (**G8790**, **D6301**); **Migration OS closed** (**G8550**); **G6731** subordinate regression.

When the user says "build" without specifying:

1. **G8550 composite** â€” `pnpm run hub:migration-os-close-smoke` (includes **G8560** + **G8600**)
2. **G8570 Open Legacy wedge** â€” `pnpm run hub:site-port-open-legacy-wedge-smoke`
3. **G6731 CWL language maintenance** â€” `pnpm run hub:cwl-language-maintenance-smoke` (subordinate)

**Closed program regression:** `hub:phase44-program-close-smoke` (**G9140**) Â· `hub:llm-convert-full-close-smoke` (**G8940**) Â· `hub:full-matrix-oracle-close-smoke` (**G8790**) Â· `hub:llm-assisted-convert-close-smoke` (**G8830**)

**Operator demo:** `pnpm run migration-evidence:demo`  
**GCE Migration OS:** `pnpm run test:gce:migration-os`  
**GPU lab dry-run:** `pnpm run gpu-lab:gce`  
**VMF hub:** `pnpm run federation:serve`

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) â€” Default queue (Phase 44 active, superseded 2026-07-04 by maintenance)

**Status:** **Phase 44 active** (**G9000**, **D6310** â€” 2026-07-04); **Phase 43 closed** (**G8940**, **D6303**); **Phase 41 closed** (**G8790**, **D6301**); **Migration OS closed** (**G8550**); **G6731** subordinate regression.

When the user says "build" without specifying:

1. **G8550 composite** â€” `pnpm run hub:migration-os-close-smoke` (includes **G8560** + **G8600**)
2. **G8570 Open Legacy wedge** â€” `pnpm run hub:site-port-open-legacy-wedge-smoke`
3. **G6731 CWL language maintenance** â€” `pnpm run hub:cwl-language-maintenance-smoke` (subordinate)
4. **Phase 44** â€” [`PHASE-44-PROGRAM.md`](./PHASE-44-PROGRAM.md): waves **G9010â€“G9085** â†’ **G9051/G9070** hole closure â†’ **G9110/G9130** Horizon C â†’ **G9121** UI â†’ **G9140** close

**Closed program regression:** `hub:phase44-build-slice-smoke` (in progress) Â· `hub:llm-convert-full-close-smoke` (**G8940**) Â· `hub:full-matrix-oracle-close-smoke` (**G8790**) Â· `hub:llm-assisted-convert-close-smoke` (**G8830**)

**Operator demo:** `pnpm run migration-evidence:demo`  
**GCE Migration OS:** `pnpm run test:gce:migration-os`  
**GPU lab dry-run:** `pnpm run gpu-lab:gce`  
**VMF hub:** `pnpm run federation:serve`

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) â€” Default queue (Phase 41 â€” Full matrix oracle product active, superseded 2026-07-03 by maintenance)

**Status:** **Phase 41 active** (**G8700**, **D6300** â€” user-amended 2026-07-03); **Phase 32 closed** (**G8290**); **Phase 40 closed** (**G8600** / **G8610**); **Migration OS closed** (**G8550**); **G6731** subordinate regression.

When the user says "build" without specifying:

1. **G8701 matrix progress** â€” `pnpm run hub:full-matrix-oracle-progress-smoke` (honest grade census)
2. **G8711 build slice** â€” `pnpm run hub:phase41-llm-build-slice-smoke` (41a.1 req/res + IS corpus refresh **G8610**)
3. **G8710 â†’ G8750** â€” Phase 41 tracks in order ([`FULL-MATRIX-ORACLE-PROGRAM.md`](./FULL-MATRIX-ORACLE-PROGRAM.md))
4. **G8550 / G8570 maintenance** â€” after each track merge
5. **G7690** universal translator regression â€” subordinate

**Program entry:** `pnpm run hub:full-matrix-oracle-program-entry-smoke` (**G8700**)  
**Program close:** `pnpm run hub:full-matrix-oracle-close-smoke` (**G8790**)

---

## 12 (archived) â€” Default queue (post Phase 32 â€” maintenance only, superseded 2026-07-03 by Phase 41)

**Status:** **Phase 40 active** (**G8600**, **D6295**); **Phase 40b active** (**G8610**, **D6296** â€” CPU prep + optional GPU lab); **Phase 39 closed** (**G8570**); **Intelligence Shorthand export closed** (**G8560**); **Migration OS closed** (**G8550**).

When the user says "build" without specifying:

1. **G8600 composite** â€” `pnpm run hub:is-runtime-close-smoke` (tier retrieval + skip-LLM routing)
2. **G8610 IS-T2 prep** â€” `pnpm run hub:is-t2-lora-prep-smoke` (train manifest; no GPU spend)
3. **G8550 composite** â€” `pnpm run hub:migration-os-close-smoke` (includes **G8560** + **G8600**)
4. **G8310 unified POC** â€” `pnpm run hub:wisp-web-llm-poc-close-smoke` (includes **G8560**; add **`CHRYSALIS_G8310_LIVE=1`** for G8320)
5. **G8570 wedge regression** â€” `pnpm run hub:site-port-open-legacy-wedge-smoke`
6. **G8290 web-LLM framework** â€” `pnpm run hub:open-web-llm-close-smoke`

**Operator demo:** `pnpm run migration-evidence:demo`  
**IS export:** `pnpm run web-llm:export-shorthand` / `chrysalis federation export-shorthand`  
**IS-T2 prep (CPU):** `pnpm run gpu-lab:prep` Â· **GPU lab (on/off):** [`GCE-GPU-LAB.md`](./GCE-GPU-LAB.md)  
**VMF hub:** `pnpm run federation:serve`  
**GCE WISP refresh:** `pnpm run wisp:deploy:gce` then `pnpm run wisp:operator-verify -- --require`  
**GCE Migration OS + live (G8320):** `pnpm run test:gce:migration-os:wisp-live`  
**Nightly CI:** `.github/workflows/open-legacy-index-nightly.yml`

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) â€” Default queue (post G8560 â€” Intelligence Shorthand closed, superseded 2026-06-16)

**Status:** **Intelligence Shorthand closed** (**G8560**, **D6290**); **Migration OS closed** (**G8550**, **D6288**); **Phase 38 closed** (**G8540**).

When the user says "build" without specifying:

1. **G8550 composite** â€” `pnpm run hub:migration-os-close-smoke` (includes **G8560** IS close)
2. **G8560 composite** â€” `pnpm run hub:intelligence-shorthand-close-smoke` (CPU only)
3. **G8540 composite** â€” `pnpm run hub:site-port-federation-hub-close-smoke`
4. **G8480 composite** â€” `pnpm run hub:migration-evidence-poc-close-smoke`

**Operator demo:** `pnpm run migration-evidence:demo`  
**IS export:** `pnpm run web-llm:export-shorthand` / `chrysalis federation export-shorthand`  
**VMF hub:** `pnpm run federation:serve`  
**Nightly CI:** `.github/workflows/open-legacy-index-nightly.yml`

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) â€” Default queue (post G8550 â€” Migration OS closed, superseded 2026-06-16)

**Status:** **Migration OS closed** (**G8550**, **D6288**); **Phase 38 closed** (**G8540**, **D6287**); **Phase 37 closed** (**G8520**, **D6286**); **Phase 35 closed** (**G8480**, **D6284**).

When the user says "build" without specifying:

1. **G8550 composite** â€” `pnpm run hub:migration-os-close-smoke`
2. **G8540 composite** â€” `pnpm run hub:site-port-federation-hub-close-smoke`
3. **G8520 composite** â€” `pnpm run hub:site-port-open-legacy-close-smoke`
4. **G8480 composite** â€” `pnpm run hub:migration-evidence-poc-close-smoke`

**Operator demo:** `pnpm run migration-evidence:demo`  
**VMF hub:** `pnpm run federation:serve`  
**Nightly CI:** `.github/workflows/open-legacy-index-nightly.yml`

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) â€” Default queue (post G8530 â€” Phase 38 VMF hub API active, superseded 2026-06-16)

**Status:** **Phase 38 VMF local hub API active** (**G8530**, **D6287**); **Phase 37 closed** (**G8520**, **D6286**); **Phase 35 closed** (**G8480**, **D6284**).

When the user says "build" without specifying:

1. **G8530 composite** â€” `pnpm run hub:site-port-federation-hub-api-smoke`
2. **G8520 composite** â€” `pnpm run hub:site-port-open-legacy-close-smoke`
3. **G8480 composite** â€” `pnpm run hub:migration-evidence-poc-close-smoke`
4. **G8500 subordinate** â€” `pnpm run hub:site-port-open-legacy-index-close-smoke`
5. **G8510 subordinate** â€” `pnpm run hub:site-port-open-legacy-nightly-smoke`

**Operator demo:** `pnpm run migration-evidence:demo`  
**VMF hub:** `pnpm run federation:serve`  
**Nightly CI:** `.github/workflows/open-legacy-index-nightly.yml`

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) â€” Default queue (post G8510 â€” Phase 37 Open Legacy expansion active, superseded 2026-06-16)

**Status:** **Phase 31 WISP CWL UI parity closed** (**G8100**, **D6274**); **WISP production completion closed** (**G7990**); **WISP production POC closed** (**G7890**); **WISP full site closed** (**G7790**).

When the user says "build" without specifying:

1. **G8100 composite** â€” `pnpm run hub:wisp-cwl-ui-parity-close-smoke` (bulk lift + anchor parity + forbidden-stub scan + chimera probes)
2. **G7990 subordinate** â€” `pnpm run hub:wisp-production-completion-close-smoke`
3. **G7890 subordinate** â€” included in **G7990**
4. **IR helper tier regression (optional)** â€” `hub:cwl-language-maintenance-smoke` (**G6731**)

**Apply chain (fixture refresh):** post-G7790 chain â†’ Phase 28g â†’ **Phase 31 bulk lift** â†’ Phase 30 â†’ Phase 30b (`wisp:full-build` / `prepareWispCwlDeployBundle`)

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) â€” Default queue (post G7990 â€” Phase 31 WISP CWL UI parity active, superseded 2026-06-16)

**Status:** **WISP production completion program closed** (**G7990**, **D6272**); **WISP production POC closed** (**G7890**); **WISP full site closed** (**G7790**); **universal translator closed** (**G7690**).

When the user says "build" without specifying:

1. **G7990 composite** â€” `pnpm run hub:wisp-production-completion-close-smoke` (includes Phase 29 + **G7890** regression)
2. **G7890 subordinate** â€” `pnpm run hub:wisp-production-poc-close-smoke`
3. **G7790 subordinate** â€” included in **G7890** composite
4. **G7690 subordinate** â€” included in **G7790** composite
5. **IR helper tier regression (optional)** â€” `hub:cwl-language-maintenance-smoke` (**G6731**)

**Apply chain (fixture refresh):** `pnpm run wisp:apply-post-g7790-chain`

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) â€” Default queue (post G7890 â€” WISP production POC closed, superseded 2026-06-27)

**Status:** **WISP production POC program closed** (**G7890**, **D6271**); **WISP full site closed** (**G7790**); **universal translator closed** (**G7690**).

When the user says "build" without specifying:

1. **G7890 composite** â€” `pnpm run hub:wisp-production-poc-close-smoke` (includes Phase 28 + **G7790** regression)
2. **G7790 subordinate** â€” `pnpm run hub:wisp-full-site-close-smoke`
3. **G7690 subordinate** â€” included in **G7790** composite
4. **IR helper tier regression (optional)** â€” `hub:cwl-language-maintenance-smoke` (**G6731**)

**Apply chain (fixture refresh):** `pnpm run wisp:apply-post-g7790-chain`

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) â€” Default queue (Phase 28 â€” WISP production POC active, superseded 2026-06-27)

**Status:** **WISP production POC program active** (**G7800**, **D6270**); **WISP full site closed** (**G7790**); **universal translator closed** (**G7690**).

When the user says "build" without specifying:

1. **Phase 28a â†’ 28d** in order â€” close gates **G7801â€“G7805** before **G7890**
2. **G7890 composite** â€” `pnpm run hub:wisp-production-poc-close-smoke` (includes **G7790** regression)
3. **G7790 subordinate** â€” `pnpm run hub:wisp-full-site-close-smoke`
4. **IR helper tier regression (optional)** â€” `hub:cwl-language-maintenance-smoke` (**G6731**)

**Apply chain:** `pnpm run wisp:apply-post-g7790-chain`

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) â€” Default queue (post G7790 â€” WISP full site closed, superseded 2026-06-26)

**Status:** **WISP full site CWL program closed** (**G7790**, **D6268**); **universal translator closed** (**G7690**); **WISP POC optional regression** preserved (**D6259**).

When the user says "build" without specifying:

1. **G7790 composite** â€” `pnpm run hub:wisp-full-site-close-smoke` (includes Phase 27 + **G7690** regression)
2. **G7690 subordinate** â€” `pnpm run hub:cwl-universal-translator-close-smoke`
3. **IR helper tier regression (optional)** â€” `hub:cwl-language-maintenance-smoke` (**G6731**)

**WISP POC (optional):** `.github/workflows/wisp-poc-regression.yml` â€” legacy operator path only.

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) â€” Default queue (Phase 27 â€” WISP full site active, superseded 2026-06-25)

**Status:** **WISP full site CWL program active** (**G7700**, **D6268**); **universal translator closed** (**G7690**); **WISP POC optional regression** preserved (**D6259**).

When the user says "build" without specifying:

1. **Phase 27a â†’ 27f** in order â€” close gates **G7701â€“G7706** before advancing
2. **G7790 composite** â€” `pnpm run hub:wisp-full-site-close-smoke` (includes **G7690** regression)
3. **G7690 subordinate** â€” `pnpm run hub:cwl-universal-translator-close-smoke`
4. **IR helper tier regression (optional)** â€” `hub:cwl-language-maintenance-smoke` (**G6731**)

**WISP POC (optional):** `.github/workflows/wisp-poc-regression.yml` â€” legacy operator path only.

**Program close (target):** **G7790** â€” `pnpm run hub:wisp-full-site-close-smoke`.

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) â€” Default queue (post G7690 â€” universal translator NÃ—N closed, superseded 2026-06-24)

**Status:** **CWL universal translator program closed** (**G7690**, **D6267**); **full web language closed** (**G7590**); **customer pilot closed** (**G7490**); **WISP POC decoupled** (**D6259**).

When the user says "build" without specifying:

1. **G7690 regression** â€” `pnpm run hub:cwl-universal-translator-close-smoke` (includes **G7590** subordinate)
2. **IR helper tier regression (optional)** â€” `hub:cwl-language-maintenance-smoke` (**G6731**)

**WISP POC (optional):** `.github/workflows/wisp-poc-regression.yml` â€” not default CI (**D6259**).

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) â€” Default queue (Phase 26 â€” universal translator NÃ—N active, superseded 2026-06-24)

**Status:** **CWL universal translator program active** (**G7600**, **D6267**); **full web language closed** (**G7590**); **customer pilot closed** (**G7490**); **WISP POC decoupled** (**D6259**).

When the user says "build" without specifying:

1. **Phase 26a â†’ 26d** in order â€” close gates **G7601â€“G7604** before advancing
2. **G7690 composite** â€” `pnpm run hub:cwl-universal-translator-close-smoke` (includes **G7590** regression)
3. **G7590 subordinate** â€” `pnpm run hub:cwl-full-web-language-close-smoke`
4. **IR helper tier regression (optional)** â€” `hub:cwl-language-maintenance-smoke` (**G6731**)

**WISP POC (optional):** `.github/workflows/wisp-poc-regression.yml` â€” not default CI (**D6259**).

**Program close (target):** **G7690** â€” `pnpm run hub:cwl-universal-translator-close-smoke`.

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) â€” Default queue (post G7590 â€” fully complete web language closed, superseded 2026-06-24)

**Status:** **CWL full web language program closed** (**G7590**, **D6266**); **customer pilot closed** (**G7490**); **universal language closed** (**G7390**); **WISP POC decoupled** (**D6259**).

When the user says "build" without specifying:

1. **G7590 regression** â€” `pnpm run hub:cwl-full-web-language-close-smoke` (includes **G7490** + Phase 25 composite)
2. **G7490 subordinate** â€” `pnpm run hub:cwl-customer-pilot-close-smoke`
3. **IR helper tier regression (optional)** â€” `hub:cwl-language-maintenance-smoke` (**G6731**)

**WISP POC (optional):** `.github/workflows/wisp-poc-regression.yml` â€” not default CI (**D6259**).

**Program regression:** **G7590** â€” `pnpm run hub:cwl-full-web-language-close-smoke`.

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) â€” Default queue (Phase 25 active â€” superseded 2026-06-24)

**Status:** **CWL full web language program active** (**G7500**, **D6264**); **customer pilot closed** (**G7490**); **universal language closed** (**G7390**); **WISP POC decoupled** (**D6259**).

When the user says "build" without specifying:

1. **Phase 25a â†’ 25d** in order â€” close gates **G7501â€“G7504** before advancing
2. **G7590 composite** â€” `pnpm run hub:cwl-full-web-language-close-smoke` (includes **G7490** regression)
3. **G7490 subordinate** â€” `pnpm run hub:cwl-customer-pilot-close-smoke`
4. **IR helper tier regression (optional)** â€” `hub:cwl-language-maintenance-smoke` (**G6731**)

**WISP POC (optional):** `.github/workflows/wisp-poc-regression.yml` â€” not default CI (**D6259**).

**Program close (target):** **G7590** â€” `pnpm run hub:cwl-full-web-language-close-smoke`.

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) â€” Default queue (post G7490 â€” customer pilot closed, superseded 2026-06-24)

**Status:** **CWL universal web language program closed** (**G7390**, **D6260**); **CWL complete language closed** (**G7150**); **IR Helper Program v1 closed** (**G7200**); **WISP POC decoupled** (**D6259**).

When the user says "build" without specifying:

1. **G7390 regression** â€” `pnpm run hub:cwl-universal-language-close-smoke`
2. **G7150 / G7200** â€” subordinate (`pnpm run hub:cwl-complete-language-close-smoke`, `pnpm run hub:ir-helper-program-close-smoke`; included in G7390 composite)
3. **IR helper tier regression (optional)** â€” `hub:cwl-language-maintenance-smoke` (**G6731**)

**WISP POC (optional):** `.github/workflows/wisp-poc-regression.yml` â€” not default CI (**D6259**).

**Program close (shipped):** **G7390** â€” `pnpm run hub:cwl-universal-language-close-smoke`.

**Shipped milestone:** **G7150** â€” `pnpm run hub:cwl-complete-language-close-smoke`.

**Index:** [`docs/PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md).

**Operator hub:** [`docs/MIGRATION-OS.md`](./MIGRATION-OS.md).

---

## 12 (archived) â€” Default queue (maintenance-only, superseded 2026-06-22)

Superseded by **D6206** Â§12 above. Maintenance-only default applied between **G6750** and **D6206**.

---

## 13. Amending this plan

1. User explicitly requests a strategy change.
2. Add `**DESIGN.md` Decision Log** entry (why).
3. Edit this file and `**ROADMAP.md`** strategic section.
4. Do not silently implement off-plan work.

---

*Related: `DESIGN.md`, `ROADMAP.md`, `docs/PAUSED-AND-MAINTENANCE.md`, `docs/CWL-SURFACE-TAXONOMY.md`, `docs/CWL.md`.*