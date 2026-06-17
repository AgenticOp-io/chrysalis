# Runtime-CWL parity plan

> **Status:** accepted (2026-06-17)  
> **Authority:** `docs/STRATEGIC-PLAN.md` §12 Month 1–2; **G5681**  
> **Package:** `@chrysalis/runtime-cwl`

## Goal

Make **in-process CWL preview/runtime** a credible authoring surface without claiming production SQL/session parity. Every runtime claim must stay tied to **verify-gated emit** paths and honest holes.

## Phase A — Gold fixture parity (shipped)

| Gate | Scope | Done when |
| --- | --- | --- |
| `runCwlRuntimeParitySmoke` | `hub-gold-cwl-fullstack`, `hub-gold-cwl-layout` | Preview + `runtime.fetch` 200 on probe paths |
| `runRuntimeCwlParityGate` | Gold + Hono parity + production probes + query/load | All sub-gates green on flagship |

Registry: `scripts/hub-ingest/hub-cwl-runtime-parity-smoke.mjs`, `hub-cwl-fullstack-gates.mjs`.

## Phase B — Emit backend parity (in progress)

| Gate | Scope | Status |
| --- | --- | --- |
| `runEmitVerifyMegaGate` | hono + fastify HTTP verify on CWL flagship | Shipped (G1839) |
| `runFastifyEmitSearchGate` | `/search` verify artifact | Shipped |
| `runProductionSearchGate` | runtime-cwl `/search?q=` probe | Shipped (RFC-0015) |

**Non-goal:** marketing "production-ready runtime" without verify evidence.

## Phase C — Session/SQL honesty (paused)

- Session stub smoke only (`runSessionStubGate`) until Redis/DB parity gates exist.
- Real SQL remains **emit + verify** authoritative; runtime-cwl uses stub DB.

## Phase D — Full-stack surface expansion (Month 3–4)

- Full-stack flagship pilot with explicit hole budget (`chrysalis.fullstack-hole-budget.json`).
- Evidence gate before widening CWL page/layout semantics.

## Operator entry points

```bash
pnpm run hub:strategic-plan-month1-hardening-smoke
pnpm run hub:cwl-authoring-batch-v63-smoke   # full runRuntimeCwlParityGate chain
```

## Invariants (DESIGN §3)

- Handlers use injected `ctx.*`; no wall-clock or real network in generated/verify sandboxes.
- Unsupported IR returns **501** with simulation errors — never invented bodies.
- `runRuntimeCwlParityGate` composes verify-gated probes; smoke-only paths do not satisfy cutover claims.
