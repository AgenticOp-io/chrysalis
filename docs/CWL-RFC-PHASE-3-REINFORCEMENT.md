# CWL RFC track — Phase 3 reinforcement

> **Status:** accepted (2026-06-17)  
> **Authority:** `docs/CWL-INTERCHANGE-PHASE-3.md`; **G5840**  
> **North star:** body, response, effects, auth presets round-trip through WebIR

## Goal

Pin **RFC gold round-trips** for the CWL interchange track — not smoke-only parser checks — before claiming Phase 3 RFC coverage.

## Phase A — RFC round-trip batch (shipped)

| RFC | Fixture | Smoke |
| --- | --- | --- |
| 0004 request context | `hub-gold-cwl-request-context` | `runCwlRequestContextRoundtripSmoke` |
| CWL-RFC-0005 request body | `hub-gold-cwl-request-body` | `runCwlBodyRoundtripDedicatedSmoke` |
| CWL-RFC-0006 response status | `hub-gold-cwl-response-status` | `runCwlStatusRoundtripSmoke` |
| CWL-RFC-0007 auth effects | `hub-gold-cwl-auth-effects` | `runCwlAuthEffectsRoundtripSmoke` |
| 0008 content-type | `hub-gold-cwl-response-content-type` | `runCwlResponseContentTypeRoundtripSmoke` |
| 0002/0003 params | path/query gold | `runCwlPathParamsRoundtripSmoke` / query |
| 0009 multi-file | `hub-gold-cwl-multi` | `runCwlMultiRoundtripSmoke` |

Composite: `runCwlAllRfcRoundtripSmoke` (**G243**).

## Phase B — STRATEGIC-PLAN reinforcement (shipped)

| Gate | Scope |
| --- | --- |
| `runStrategicPlanPhase3CwlRfcGate` | doc + all RFC roundtrips |

```bash
pnpm run hub:strategic-plan-phase3-cwl-rfc-smoke
```

Set `CHRYSALIS_STRATEGIC_PLAN_SKIP_CWL_RFC_ROUNDTRIP=1` for doc-only (Vitest default).

## Invariants (DESIGN §3)

- Round-trip goes through WebIR — no direct AST bypass
- Unsupported constructs remain holes in round-trip fixtures
