# Node/Express oracle origin plan

> **Status:** accepted (2026-06-17)  
> **Authority:** `docs/STRATEGIC-PLAN.md` §12 Month 2–3; **G5710**  
> **Fixture:** `fixtures/hub-flagship-express` (20 routes, zero holes)

## Goal

Establish **JavaScript → Hono** as the first **second oracle origin** with live Express capture and verify replay on emitted TypeScript — without claiming full-stack component parity.

## Tier

**Oracle product** per `docs/CAPABILITY-MATRIX.md`: live Express server + `record-live-http` corpus + `@chrysalis/verify` replay on emitted Hono.

## Phase A — Flagship lift + emit parity (shipped)

| Gate | Scope | Done when |
| --- | --- | --- |
| `runExpressDepthGate` | JS lift, emit parity, OpenAPI export on express flagship | `runExpressFlagshipSmoke` ok |
| `hub:express-flagship` | GCE phase smoke | Lift 20 routes, 0 holes |

## Phase B — Live oracle verify (shipped)

| Gate | Scope | Done when |
| --- | --- | --- |
| `runNodeExpressOracleFlagshipGate` | Full capture + replay pipeline | `hub-node-express-oracle-verify` ok |
| `hub:node-express-oracle-verify` | Standalone CLI + GCE phase | Correctness threshold met |

Registry: `scripts/hub-ingest/hub-node-express-oracle-verify.mjs`.

## Phase C — Program integration (in progress)

| Program | Status |
| --- | --- |
| Capability matrix row | Shipped (javascript→hono) |
| Hub completion heavy smoke | Optional env-gated |
| STRATEGIC-PLAN reinforcement | `runStrategicPlanMonth23ExpressOracleGate` (G5710) |

## Operator entry points

```bash
pnpm run hub:strategic-plan-month23-express-oracle-smoke
pnpm run hub:node-express-oracle-verify
pnpm run hub:express-flagship
```

Set `CHRYSALIS_STRATEGIC_PLAN_SKIP_ORACLE_VERIFY=1` for lift/emit depth only (Vitest default).

## Non-goals

- Marketing Node/Express as production-ready for arbitrary apps without flagship evidence
- Full-stack CWL component lowering (see `docs/CWL-FULLSTACK-SCOPE-RFC.md`)
- Python/Java second origins before Express flagship is boringly reliable

## Invariants (DESIGN §3)

- Oracle capture uses injected context; verify replay is authoritative for cutover claims
- Lift holes must remain explicit — flagship pins **0 holes** on 20 routes
