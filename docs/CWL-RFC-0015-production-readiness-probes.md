# CWL RFC-0015 — Production-readiness runtime probes

**Status:** accepted (2026-06-01)  
**Tracking:** G1361, DESIGN D1361

## Summary

After full-stack CWL graduation (batch v20), **production-readiness** extends `@chrysalis/runtime-cwl` smoke probes beyond happy-path pages to include **query-param HTML** routes and other high-traffic surfaces under the injected context (`ctx.*`).

## Probe contract

| Probe | Route | Assertion |
| --- | --- | --- |
| `GET /search?q=` | `/search?q={token}` | HTTP 200, HTML contains query token |
| `GET /blog/:slug` | `/blog/{slug}` | page-load sidecar + slug interpolation (existing) |

Registry: `scripts/hub-ingest/hub-cwl-runtime-production-smoke.mjs`, gate `runProductionSearchGate` in `hub-cwl-fullstack-gates.mjs`.

## Non-goals

- Real network, `process.env`, or wall-clock in generated handlers
- Hydration or client-side routing
- Production SQL/session (Phase 6 long-horizon; separate gates)
