# Second oracle — live verify reinforcement

> **Status:** accepted (2026-06-17)  
> **Authority:** `docs/SECOND-ORACLE-ORIGIN-PHASE-4.md`; **G5890**  
> **North star:** live Express capture + verify replay on emitted Hono

## Goal

Pin **live oracle verify** on the Express flagship before claiming second-origin oracle-product tier in operator reports.

## Phase A — Live verify pipeline (shipped)

| Gate | Scope | Done when |
| --- | --- | --- |
| `runNodeExpressOracleFlagshipGate` | Full capture + replay | `hub-node-express-oracle-verify` ok |

Registry: `scripts/hub-ingest/hub-node-express-oracle-verify.mjs` (**G1819**).

## Phase B — STRATEGIC-PLAN reinforcement (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase4LiveOracleVerifyGate` | doc + live verify |

```bash
pnpm run hub:strategic-plan-phase4-live-oracle-verify-smoke
```

Set `CHRYSALIS_STRATEGIC_PLAN_SKIP_ORACLE_VERIFY=1` for doc-only (Vitest default).

## Invariants (DESIGN §3)

- Verify replay is authoritative — no smoke-only capture claims
- Injected context only inside generated handlers and verify sandboxes
