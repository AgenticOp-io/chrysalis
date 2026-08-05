# Chrysalis Web Language (CWL)

**Package:** `@chrysalis/cwl`  
**Version:** must equal [`LANGUAGE_VERSION.md`](../../LANGUAGE_VERSION.md) (currently `0.1.7`)  
**Status:** `private: true` — not published yet (Phase 1.0)

## Purpose

**CWL** is THE language of the web for AgenticOps: a single surface syntax for routes, pages, data, UI, effects, and honest holes, mapped 1:1 to **WebIR**.

## Public API

- **Pin package:** `import { VERSION, pillarRoot, languageVersion } from '@chrysalis/cwl'`
- Grammar and semantics: **`docs/language/CWL.md`**
- Constitution: **`docs/language/CWL-PILLAR-HOME.md`**
- CLI: **`docs/language/CWL-CLI.md`** (`npm run cwl -- …` from repo root)
- Language version: **`LANGUAGE_VERSION.md`**
- Publish / pin path: **`docs/language/CWL-PUBLISH.md`**
- Golden fixtures: **`fixtures/language-gold/`**
- Round-trip gate: **`npm run test:cwl-roundtrip`**
- **Runtime:** **`@chrysalis/runtime-cwl`** — in-process HTTP server via WebIR simulation (G154)
- **Emit:** **`@chrysalis/emit-runtime-cwl`** — deployable Node project (`routes.cwl` + `webir.json` + server entry)
- Ingest: **`scripts/hub-ingest/cwl-ingest.mjs`** (`.cwl` → WebIR)
- Print: **`scripts/hub-ingest/cwl-print.mjs`** (AST → `.cwl`, no WebIR)
- Emit: **`scripts/hub-ingest/emit-cwl-from-hub.mjs`** (WebIR → `.cwl`)
- Parser: **`scripts/hub-ingest/cwl-parser.mjs`**

## Version rule

`packages/cwl/package.json` `"version"` **≡** `LANGUAGE_VERSION.md`. Bump both together when the language surface changes for consumers. Do not publish until Phase 1.0 exit criteria are met — see [`CWL-PUBLISH.md`](../../docs/language/CWL-PUBLISH.md).

## Invariants

- Every valid CWL route maps **directly** to WebIR without lossy regex lift.
- Unsupported behavior uses explicit **`hole`** statements (same hole policy as DESIGN.md).
- Generated targets still use **injected ctx** when emitting TypeScript frameworks.
- **Runtime** uses `simulateHandler` (D19); inconclusive ops return **501**, not invented responses.

## Non-goals

- Replacing PHP, TypeScript, or Python in legacy codebases.
- A full production runtime with real SQL/session (use emit + verify for migrations; runtime is for authoring/preview).
- Helix firewall features (Secure owns DNA enforcement).
