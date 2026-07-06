# @chrysalis/emit-runtime-cwl

## Purpose

Emit a **deployable Node project** that runs CWL via **`@chrysalis/runtime-cwl`** — WebIR simulation, no Hono/Fastify handler codegen. The emitted tree ships **`routes.cwl`**, **`src/webir.json`**, **`vendor/@chrysalis/*`** (self-contained runtime stack), **`Dockerfile`**, and **`README.md`**.

## Public API

- `emit({ module, outDir, cwlSource, holeCount?, runtimeCwlDependency?, bundleRuntime?, provenanceRoot? })` — write runtime-cwl project scaffold

### CLI

```
chrysalis emit <project> --out <dir> --target=runtime-cwl
```

## Invariants

- **`bundleRuntime: true` (default)** vendors `webir`, `oracle`, `insight`, `verify`, `rewrite`, `runtime-cwl` under `vendor/` for Docker/npm deploy without the monorepo.
- **`src/webir.json`** is the boot-time module source (no monorepo bridge required at runtime).
- **`routes.cwl`** is the human-readable contract; re-ingest + verify remain authoritative for migration claims.
- Unsupported IR returns **501** via simulator — never invented bodies (**DESIGN §3**).

## Non-goals

- Replacing hono/fastify emit for production chimera cutover (those paths stay verify-gated HTTP replay).
- Browser/worker runtimes (Node in-process only in v1).
