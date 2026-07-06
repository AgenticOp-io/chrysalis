# @chrysalis/runtime-cwl-worker

## Purpose

**Worker/edge runtime scaffold** for CWL WebIR modules. Holds the contract for a future emit target that boots golden WebIR JSON in isolates (Cloudflare Workers, service workers) — **Phase 46 stub only**.

## Public API

- `CWL_WORKER_RUNTIME_KIND` — artifact kind constant
- `createCwlWorkerRuntimeHandle({ moduleKind })` — placeholder handle for verify harness wiring

## Invariants

- No network, wall-clock, or randomness in scaffold APIs
- Production claims require emit package + verify replay (future)

## Non-goals

- Full worker emit backend in Phase 46 entry
- SQL/session fidelity in edge isolates
