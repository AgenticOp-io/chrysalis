# CWL universal translator parity

> **Status:** **shipped** (2026-06-24, **G7590**, **D6265**)  
> **Authority:** [`CWL-FULL-WEB-LANGUAGE-PROGRAM.md`](./CWL-FULL-WEB-LANGUAGE-PROGRAM.md) Phase 25c–25d; **G7503** / **G7504**  
> **Baseline:** [`PROJECT-TO-CWL-TRANSLATE-PATH.md`](./PROJECT-TO-CWL-TRANSLATE-PATH.md) (G5720, shipped)

## Goal

The **universal translator** (lift → WebIR → `migration.cwl` on every hub web origin + oracle flagships) must meet the **same evidence bar as CWL-authored modules** — not a separate, weaker interchange path.

| CWL-authored bar | Translator parity bar |
| --- | --- |
| Hole budget zero on flagship | Oracle flagships hole-free export |
| 100% native projection on chartered modules | Web-origin matrix ≥99% native aggregate |
| Gold verify (hono + fastify) | Same suites on CWL flagship; oracle export verify |
| HTTP oracle verify | `runCwlFullstackVerifyHttpSmoke` + translate-path mandatory gate |
| Semantic diff on change | `runCwlDiffMandatoryGate` + migration contract |

## Components

| Component | Script / gate |
| --- | --- |
| Per-origin export | `runProjectToCwlAllOrigins` — 24/24 origins |
| Oracle flagships | `runProjectToCwlOracleGates` — plain-php, symfony, express |
| Mandatory translate path | `runProjectToCwlMandatoryGate` |
| Strategic plan month 3 | `runStrategicPlanMonth3ProjectToCwlGate` |
| CWL diff | `runCwlDiffMandatoryGate` |

## Phase 25c close criteria (**G7503**)

1. Charter oracle origins **hole-free**
2. `runProjectToCwlAllOrigins` — all fixtures export OK
3. Web-origin IDs in charter — aggregate native ratio ≥ `translatorWebOriginMinNativeRatio`
4. `runStrategicPlanMonth3ProjectToCwlGate` green (roundtrip optional via `CHRYSALIS_STRATEGIC_PLAN_SKIP_PROJECT_CWL_ROUNDTRIP=1` in Vitest)

## Phase 25d close criteria (**G7504**) — verify replay

1. `runCwlFullstackFlagshipSmoke` — CWL reference bar
2. `runCwlFullstackVerifyHttpSmoke` — HTTP cutover on CWL flagship
3. `runStrategicPlanMonth3ProjectToCwlGate` — translate path doc + oracle composite

```bash
pnpm run hub:cwl-translator-parity-smoke      # G7503
pnpm run hub:cwl-translator-verify-smoke      # G7504
pnpm run hub:cwl-phase25c-close-smoke
pnpm run hub:cwl-phase25d-close-smoke
```

Set `CHRYSALIS_STRATEGIC_PLAN_SKIP_FLAGSHIP_GOLD=1` and `CHRYSALIS_STRATEGIC_PLAN_SKIP_PROJECT_CWL_ROUNDTRIP=1` in Vitest.

## Non-goals

- Claiming pattern-lift toy probes are production apps
- Skipping holes on oracle tier “because export succeeded”
- Translator without WebIR provenance (**DESIGN §3**)

## Invariants

- Export always through WebIR — no shortcut emit
- Holes explicit in `migration.cwl` and diagnose until closed by ingest
- Verify replay authoritative; structural export alone is insufficient for oracle tier
