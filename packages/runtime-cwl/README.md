# @chrysalis/runtime-cwl

## Purpose

In-process **HTTP runtime** for **Chrysalis Web Language (CWL)**. Loads CWL → WebIR (via hub export) and serves routes using the WebIR simulator (`@chrysalis/rewrite`), with injected request context — no Hono/Fastify emit required.

## Public API

- `loadModuleFromCwlFile(path)` — lift `.cwl` to WebIR (monorepo hub bridge)
- `loadModuleFromWebirJsonFile(path)` — load golden WebIR JSON
- `createCwlRuntime({ module, uiAssets? })` — `fetch()` + Node `http` handler; optional **`uiAssets`** (**G9470** / **D6368**) wraps HTML fragments with document-shell stylesheet links and serves `/assets/original-css/*`
- `loadCwlUiAssetsFromProject(projectDir)` — load `.chrysalis/ui-assets/` for `uiAssets`
- `startCwlServer({ runtime, host, port })` — bind TCP port

### CLI

```
pnpm exec chrysalis-cwl-serve --cwl fixtures/site-scale-matrix/routes.cwl --project fixtures/site-scale-matrix --port 8787
```

## Invariants

- Uses **`simulateHandler`** — same semantics as behavior-verify (D19), not a full PHP/TS runtime.
- Optional **`session`** / **`resolveSession`** on `createCwlRuntime` for injected preview session maps (**G6209**, **G6210+**).
- Unsupported IR ops return **501** with simulation errors (honest hole), never invented bodies.
- No `Date.now()`, `Math.random()`, or real network inside handlers (simulator + stub DB).

## Non-goals

- Replacing emitted Hono/Fastify for production migrations (chimera path stays emit + verify).
- Full SQL/session fidelity in runtime-cwl (Phase 10 **active** — use **`session`** / **`resolveSession`** on `createCwlRuntime` for injected session maps; **HTTP replay verify remains authoritative** for production SQL/session claims).
