# Chrysalis Web Language (CWL)

## Purpose

**CWL** is the WebIR-native authoring language for the Translation Hub: a single surface syntax that consolidates what is common across PHP, JavaScript, Python, Java, Go, and other web stacks after lowering to **WebIR**.

## Public API

- Grammar and semantics: **`docs/CWL.md`**
- **Runtime:** **`@chrysalis/runtime-cwl`** — in-process HTTP server via WebIR simulation (G154)
- **Emit:** **`@chrysalis/emit-runtime-cwl`** — deployable Node project (`routes.cwl` + `webir.json` + server entry)
- Ingest: **`scripts/hub-ingest/cwl-ingest.mjs`** (`.cwl` → WebIR)
- Emit: **`scripts/hub-ingest/emit-cwl-from-hub.mjs`** (WebIR → `.cwl`)
- Parser: **`scripts/hub-ingest/cwl-parser.mjs`**

## Invariants

- Every valid CWL route maps **directly** to WebIR without lossy regex lift.
- Unsupported behavior uses explicit **`hole`** statements (same hole policy as DESIGN.md).
- Generated targets still use **injected ctx** when emitting TypeScript frameworks.
- **Runtime** uses `simulateHandler` (D19); inconclusive ops return **501**, not invented responses.

## Non-goals

- Replacing PHP, TypeScript, or Python in legacy codebases.
- A full production runtime with real SQL/session (use emit + verify for migrations; runtime is for authoring/preview).
