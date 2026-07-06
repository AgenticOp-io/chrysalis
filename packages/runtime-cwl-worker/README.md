# @chrysalis/runtime-cwl-worker

## Purpose

**Worker/edge runtime** for CWL WebIR modules. Delegates fetch dispatch to `@chrysalis/runtime-cwl` simulate — contract for future worker emit targets (Cloudflare Workers, service workers).

## Public API

- `CWL_WORKER_RUNTIME_KIND` — artifact kind constant
- `createCwlWorkerRuntimeHandle({ module })` — route count metadata
- `createCwlWorkerFetchHandler(config)` — fetch delegate
- `createCwlWorkerRuntime(config)` — handle + fetch + stop

## Invariants

- Uses injected `ctx.*` via runtime-cwl simulate path
- Production claims require emit package + verify replay (future)

## Non-goals

- Full worker emit backend
- SQL/session fidelity in edge isolates without oracle
