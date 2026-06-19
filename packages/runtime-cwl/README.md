# @chrysalis/runtime-cwl

## Purpose

In-process **HTTP runtime** for **Chrysalis Web Language (CWL)**. Loads CWL → WebIR (via hub export) and serves routes using the WebIR simulator (`@chrysalis/rewrite`), with injected request context — no Hono/Fastify emit required.

## Public API

- `loadModuleFromCwlFile(path)` — lift `.cwl` to WebIR (monorepo hub bridge)
- `loadModuleFromWebirJsonFile(path)` — load golden WebIR JSON
- `createCwlRuntime({ module })` — `fetch()` + Node `http` handler
- `startCwlServer({ runtime, host, port })` — bind TCP port

### CLI

```
pnpm exec chrysalis-cwl-serve --cwl fixtures/hub-gold-cwl/routes.cwl --port 8787
```

## Invariants

- Uses **`simulateHandler`** — same semantics as behavior-verify (D19), not a full PHP/TS runtime.
- Unsupported IR ops return **501** with simulation errors (honest hole), never invented bodies.
- No `Date.now()`, `Math.random()`, or real network inside handlers (simulator + stub DB).

## Non-goals

- Replacing emitted Hono/Fastify for production migrations (chimera path stays emit + verify).
- Full SQL/session fidelity in runtime-cwl (Phase 10 **active** — stub session + injected maps; **HTTP replay verify remains authoritative** for production SQL/session claims).
