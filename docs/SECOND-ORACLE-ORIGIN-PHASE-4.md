# Second oracle origin — Phase 4 plan

> **Status:** closed (2026-06-17)  
> **Authority:** `docs/STRATEGIC-PLAN.md` Phase 4; **G5880**  
> **North star:** JavaScript/Express → Hono with live oracle capture + verify replay

## Goal

Open **Phase 4** with verify-gated second-origin depth: Express flagship lift/emit parity, capability matrix oracle-product row for `javascript→hono`, and optional live oracle verify before marketing a second origin.

## Phase A — Express flagship depth (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanMonth23ExpressOracleGate` | doc + lift/emit depth + optional live verify |

Registry: `docs/NODE-EXPRESS-ORACLE-ORIGIN-PLAN.md` (**G5710**).

```bash
pnpm run hub:strategic-plan-month23-express-oracle-smoke
```

Set `CHRYSALIS_STRATEGIC_PLAN_SKIP_ORACLE_VERIFY=1` for lift/emit depth only (Vitest default).

## Phase B — Capability matrix oracle-product row (shipped)

| Gate | Scope |
| --- | --- |
| `runSecondOracleOriginCapabilityGate` | `javascript→hono` on `fixtures/hub-flagship-express` |

Registry: `docs/CAPABILITY-MATRIX.md`, `hub-capability-matrix.mjs`.

## Phase C — STRATEGIC-PLAN entry reinforcement (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase4SecondOracleOriginEntryGate` | doc + capability row + Express oracle depth |

```bash
pnpm run hub:strategic-plan-phase4-second-oracle-origin-entry-smoke
```

Set `CHRYSALIS_STRATEGIC_PLAN_SKIP_ORACLE_VERIFY=1` for capability + lift depth only (Vitest default).

## In progress (Phase 4 backlog)

_(none — Phase 4 reinforcement queue complete at G5923; default queue follows STRATEGIC-PLAN Phase 5 unless amended.)_

## Phase D — Live oracle verify (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase4LiveOracleVerifyGate` | doc + `runNodeExpressOracleFlagshipGate` |

Registry: `docs/SECOND-ORACLE-LIVE-VERIFY-PHASE-4.md`.

```bash
pnpm run hub:strategic-plan-phase4-live-oracle-verify-smoke
```

Set `CHRYSALIS_STRATEGIC_PLAN_SKIP_ORACLE_VERIFY=1` for doc-only (Vitest default).

## Phase E — Express depth batch (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase4ExpressDepthBatchGate` | doc + `runExpressDepthBatchSmoke` |

Registry: `docs/EXPRESS-DEPTH-BATCH-PHASE-4.md`.

```bash
pnpm run hub:strategic-plan-phase4-express-depth-batch-smoke
```

## Phase F — Express delivery batch (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase4ExpressDeliveryBatchGate` | doc + `runExpressDeliveryBatchSmoke` |

Registry: `docs/EXPRESS-DELIVERY-BATCH-PHASE-4.md`.

```bash
pnpm run hub:strategic-plan-phase4-express-delivery-batch-smoke
```

## Phase G — Phase 4 program close (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase4SecondOracleOriginCloseGate` | entry + live verify + depth + delivery |

```bash
pnpm run hub:strategic-plan-phase4-second-oracle-origin-close-smoke
```

Skip live verify: `CHRYSALIS_STRATEGIC_PLAN_SKIP_ORACLE_VERIFY=1`.

## Operator entry points

```bash
pnpm run hub:strategic-plan-month23-express-oracle-smoke
pnpm run hub:node-express-oracle-verify
pnpm run hub:express-flagship
pnpm run hub:express-depth-batch-smoke
pnpm run hub:express-delivery-batch-smoke
```

## Non-goals

- Python/Java second origins before Express flagship is boringly reliable
- Marketing "any language" without oracle-product evidence
- Full-stack CWL component lowering (see `docs/CWL-FULLSTACK-SCOPE-RFC.md`)

## Invariants (DESIGN §3)

- Oracle capture uses injected context; verify replay is authoritative for cutover claims
- Lift holes must remain explicit — Express flagship pins **0 holes** on 20 routes
