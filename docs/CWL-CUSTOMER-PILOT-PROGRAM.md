> **Archive notice:** Closed **program** — regression and history only. Active stack: [MIGRATION-OS.md](./MIGRATION-OS.md). Index: [rchive/INDEX.md](./archive/INDEX.md).

# CWL customer pilot at scale (Phase 24)

> **Status:** **Program closed** (2026-06-24, **G7490**) — was **active** (**G7400**, 2026-06-24)  
> **Authority:** **DESIGN D6262** / **D6263**; [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) §7; [`CWL-FULLSTACK-FLAGSHIP-PILOT.md`](./CWL-FULLSTACK-FLAGSHIP-PILOT.md)  
> **Requires:** **G7390** universal language program **closed**

## Thesis

Move from chartered fixture proof (**G7390**) to a **named customer pilot slice** with signed hole budget, multi-origin ingest, oracle verify replay, and HTTP cutover evidence — north-star metrics in **STRATEGIC-PLAN §0**.

**Pilot slice:** `fixtures/hub-pilot-customer-slice/chrysalis.pilot-charter.v1.json` → CWL module `fixtures/hub-flagship-cwl-fullstack` + PHP origins `hub-flagship-plain-php`, `hub-flagship-symfony`.

**Not WISP:** WISP remains optional POC only (**D6259**).

## Phases (shipped)

### Phase 24a — Pilot charter (**G7401**)

**Win:** Signed charter, hole budget, in-scope route manifest.

| Deliverable | Criterion |
| --- | --- |
| Charter sidecar | `chrysalis.pilot-charter.v1.json` |
| Hole budget | `chrysalis.fullstack-hole-budget.json` on CWL fixture |
| Route manifest | parsed CWL routes ≥ `minInScopeRoutes` |

**Close:** `pnpm run hub:cwl-phase24a-close-smoke`

### Phase 24b — Ingest depth (**G7402**)

**Win:** PHP flagship origins export hole-free CWL migration paths.

**Close:** `pnpm run hub:cwl-phase24b-close-smoke`

### Phase 24c — Verify replay (**G7403**)

**Win:** Gold verify + trace replay on flagship hono/fastify suites; flagship hole budget green.

**Close:** `pnpm run hub:cwl-phase24c-close-smoke`

### Phase 24d — Cutover evidence (**G7404**)

**Win:** HTTP oracle verify on emitted hono + fastify (in-process sandbox).

**Close:** `pnpm run hub:cwl-phase24d-close-smoke`

### Program close (**G7490**)

**Win:** Phases **24a–24d** + **G7390** regression composite green.

**Smoke:** `pnpm run hub:cwl-customer-pilot-close-smoke`

Program close **G7490** composes Phases **24a–24d** + **G7390** regression + **G7150** / **G7200** (via G7390 composite).

## Gates

| ID | Gate | Smoke |
| --- | --- | --- |
| **G7400** | Program entry *(archived)* | `hub:cwl-customer-pilot-program-entry-smoke` |
| **G7401** | Phase 24a charter close | `hub:cwl-phase24a-close-smoke` |
| **G7402** | Phase 24b ingest close | `hub:cwl-phase24b-close-smoke` |
| **G7403** | Phase 24c verify close | `hub:cwl-phase24c-close-smoke` |
| **G7404** | Phase 24d cutover close | `hub:cwl-phase24d-close-smoke` |
| **G7490** | **Customer pilot program close** | `hub:cwl-customer-pilot-close-smoke` |

## Default regression (program closed)

1. **G7490 regression** — `pnpm run hub:cwl-customer-pilot-close-smoke`
2. **G7390 subordinate** — included in G7490 composite
3. **G6731** optional — `hub:cwl-language-maintenance-smoke`

## Explicit non-goals

- Live proprietary customer repo oracle (operator-only)
- GenieACS / WISP as default CI
- Marketing claims without pilot verify evidence

## Related

- [`CWL-UNIVERSAL-LANGUAGE-PROGRAM.md`](./CWL-UNIVERSAL-LANGUAGE-PROGRAM.md) — **G7390**
- [`CWL-FULLSTACK-FLAGSHIP-PILOT.md`](./CWL-FULLSTACK-FLAGSHIP-PILOT.md) — hole budget + evidence gates
- [`PAUSED-AND-MAINTENANCE.md`](./PAUSED-AND-MAINTENANCE.md)
