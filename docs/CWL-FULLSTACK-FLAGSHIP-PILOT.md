# CWL full-stack flagship pilot

> **Status:** accepted (2026-06-17)  
> **Authority:** `docs/STRATEGIC-PLAN.md` §12 Month 3–4; **G5730**  
> **Fixture:** `fixtures/hub-flagship-cwl-fullstack`

## Goal

Prove a **CWL-authored full-stack flagship** can ship with an explicit **hole budget**, preview/runtime evidence, and gold verify — without claiming origin component-tree lowering.

## Phase A — Hole budget manifest (shipped)

Sidecar: `fixtures/hub-flagship-cwl-fullstack/chrysalis.fullstack-hole-budget.json`

| Field | Flagship value | Meaning |
| --- | --- | --- |
| `maxHoles` | **0** | No catalogued or uncatalogued holes in pilot |
| `minRoutes` | **8** | Minimum route surface |
| `minPageRoutes` | **4** | HTML page routes |
| `minPageLoadRoutes` | **1** | RFC-0013 load sidecar |
| `minInterpolationRoutes` | **3** | Query/path HTML interpolation |
| `minApiRoutes` | **3** | JSON API handlers |

Registry: `scripts/hub-ingest/hub-cwl-fullstack-hole-budget.mjs`, gate `runHoleBudgetV2Gate`.

## Phase B — Evidence gates (shipped)

Listed in budget `evidenceGates` and enforced by `runCwlFullstackFlagshipSmoke`:

| Gate | Scope |
| --- | --- |
| `cwl-preview` | Runtime probe 200 on flagship |
| `cwl-diagnose` | Parse + catalogued-hole policy |
| `runtime-parity` | In-process runtime-cwl smoke |
| `gold-verify` | hono + fastify gold suites |

Delivery dashboard interpolation check: `runDeliveryInterpolationGate`.

## Phase C — STRATEGIC-PLAN reinforcement (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanMonth34FullstackPilotGate` | doc + budget + interpolation + flagship smoke |

```bash
pnpm run hub:strategic-plan-month34-fullstack-pilot-smoke
```

Set `CHRYSALIS_STRATEGIC_PLAN_SKIP_FLAGSHIP_GOLD=1` to skip gold verify subprocesses (Vitest default).

## Non-goals

- Zero holes on SvelteKit/Next.js **origin** lifts (component holes remain catalogued per RFC-0012)
- Full-stack oracle parity for every matrix pair
- Hydration or client-side routing

## Invariants (DESIGN §3)

- Budget violations fail the gate — no silent hole ceiling bumps
- Gold verify remains authoritative for structural emit parity
- Preview uses injected context only
