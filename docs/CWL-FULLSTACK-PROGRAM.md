# CWL full-stack program

> **Status:** closed (2026-06-17)  
> **Authority:** `docs/STRATEGIC-PLAN.md` Phase 7 (parallel track); hub-completion schema **510**  
> **Maintenance:** no new per-queue markdown; amend this doc + `DESIGN.md` Decision Log only

## Summary

The **CWL full-stack authoring program** ran as numbered **queues 6–437** (ROADMAP **G1159–G4956**), each queue shipping a batch smoke, hub-completion schema bump, and Vitest gate coverage. The program is **complete**; successor work follows the locked strategic plan (**Phase 5+**), not new queue ladders.

| Milestone | Queues | Hub schema | Notes |
| --- | --- | --- | --- |
| Authoring bootstrap | 6–70 | 183 | Templates, preview, runtime-cwl parity v1 |
| Month 2–3 depth | 71–90 | 163 | Express oracle slice, full-stack pilot |
| Hub verify-gaps bridge | 91–110 | 183 | Post-110 reinforcement |
| Post-110 Phase C | 111–437 | 510 | Phase H–T locks; ladder complete |

## Formal references

| Document | Purpose |
| --- | --- |
| [`docs/CWL-FULLSTACK-SCOPE-RFC.md`](./CWL-FULLSTACK-SCOPE-RFC.md) | Backend vs frontend/SSR boundaries and hole policy |
| [`docs/CWL-FULLSTACK-FLAGSHIP-PILOT.md`](./CWL-FULLSTACK-FLAGSHIP-PILOT.md) | Flagship pilot with hole budget |
| [`docs/RUNTIME-CWL-PARITY-PLAN.md`](./RUNTIME-CWL-PARITY-PLAN.md) | In-process runtime parity gates |
| [`docs/archive/CWL-FULLSTACK-BUILD-LOG.md`](./archive/CWL-FULLSTACK-BUILD-LOG.md) | **Archived** per-queue build log (compiled) |

## Operator smokes (representative)

```bash
pnpm run hub:cwl-authoring-batch-v63-smoke    # runtime-cwl parity chain
pnpm run hub:strategic-plan-month12-runtime-parity-smoke
pnpm run hub:strategic-plan-month34-fullstack-pilot-smoke
pnpm run hub:strategic-plan-phase3-fullstack-alignment-smoke
```

Vitest defaults skip heavy HTTP via `CHRYSALIS_STRATEGIC_PLAN_SKIP_EMIT_HTTP=1` and related env flags.

## GCE proof

Full authoring batch proof runs on Linux GCE (`docs/GCE-LOCAL-VERIFY.md`). Windows runs gate-only Vitest locally (`docs/WINDOWS-COMPAT.md`).

## Non-goals (unchanged)

- Hydration, client stores, or component trees as production parity
- Matrix gold marketing for every origin×target pair
- New per-queue `CWL-FULLSTACK-NEXT-10-*.md` files without plan amendment

## Invariants (DESIGN §3)

- Unsupported constructs remain **holes** until verified lowering exists
- Full-stack claims require verify/replay evidence — not smoke-only ingest
