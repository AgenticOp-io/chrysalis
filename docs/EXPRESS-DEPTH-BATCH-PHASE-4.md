# Express depth batch — Phase 4

> **Status:** accepted (2026-06-17)  
> **Authority:** `docs/SECOND-ORACLE-ORIGIN-PHASE-4.md`; **G5900**  
> **North star:** site intel + path advice + project-to-CWL on Express flagship

## Goal

Prove **Migration OS depth** for the JavaScript/Express origin — scan, pair advice, and CWL contract export — before GCE mega runs.

## Phase A — Per-pillar smokes (shipped)

| Smoke | Scope |
| --- | --- |
| `runSiteIntelligenceExpressSmoke` | primaryOrigin + route count |
| `runPathAdviceExpressSmoke` | pair grade + programId |
| `runProjectToCwlExpressSmoke` | migration.cwl + hole-free routes |

Composite: `runExpressDepthBatchSmoke` (**G420**).

## Phase B — STRATEGIC-PLAN reinforcement (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase4ExpressDepthBatchGate` | doc + depth batch |

```bash
pnpm run hub:strategic-plan-phase4-express-depth-batch-smoke
```

## Invariants (DESIGN §3)

- Project-to-CWL export requires WebIR provenance — not smoke-only contract claims
