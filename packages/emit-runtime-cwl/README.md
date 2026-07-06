# @chrysalis/emit-runtime-cwl

## Purpose

Emit a **deployable Node project** that runs CWL via **`@chrysalis/runtime-cwl`** — WebIR simulation, no Hono/Fastify handler codegen. The emitted tree ships **`routes.cwl`** (authoring source), **`src/webir.json`** (golden snapshot for boot), and a thin **`src/index.ts`** server entry.

## Public API

- `emit({ module, outDir, cwlSource, holeCount?, runtimeCwlDependency?, provenanceRoot? })` — write runtime-cwl project scaffold

### CLI

```
chrysalis emit <project> --out <dir> --target=runtime-cwl
```

## Invariants

- **`webir.json`** is the boot-time module source (no monorepo `export-cwl-webir` bridge required at runtime).
- **`routes.cwl`** is the human-readable contract; re-ingest + verify remain authoritative for migration claims.
- Unsupported IR returns **501** via simulator — never invented bodies (**DESIGN §3**).

## Non-goals

- Replacing hono/fastify emit for production chimera cutover (those paths stay verify-gated HTTP replay).
- Browser/worker runtimes (Node in-process only in v1).
