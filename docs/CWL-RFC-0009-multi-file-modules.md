# CWL RFC 0009 — Multi-file modules (`import`)

**Status:** accepted (2026-05-29)  
**ROADMAP:** G155  
**DESIGN:** D454

## Summary

Split large migration contracts across files while preserving zero-loss ingest:

```cwl
module api;

import "routes/health.cwl";
import "routes/items.cwl";

use json;

@route GET "/"
handler root {
  effects: none;
  return { ok: true };
}
```

Imported fragments may omit `module` and contain only route declarations.

## Motivation

Real projects exceed a single `migration.cwl`. Phase 3 needs composable contracts without losing WebIR fidelity or duplicating routes at lift time.

## Syntax

| Line | Meaning |
| --- | --- |
| `import "relative/path.cwl";` | Merge routes and module `use` presets from the resolved file |

Rules:

- Paths are **relative to the importing file** (POSIX `/` separators).
- Imports are **module-level only** (alongside `module`, `use`, `use auth`).
- Nested imports are allowed; **cycles** throw `cwl:import-cycle`.
- Duplicate `METHOD path` across the merged graph becomes an honest hole (`cwl:duplicate-route`) on every conflicting route.

## Lift / ingest

- **`cwl-module-graph.mjs`**: `resolveCwlModuleFromPath` walks the import graph.
- **`cwl-ingest.mjs`**: resolves imports when the entry path exists on disk.
- **`lift-to-webir.mjs`**: for CWL projects with multiple `.cwl` files, lifts only `routes.cwl` when present (fragments are reached via imports).

## Verification

- Gold fixture **`fixtures/hub-gold-cwl-multi`** (`cwl-multi-gold-hono` suite).
- Strategic test **G155** in `packages/cli/tests/hub-strategic.test.ts`.
- Parser tests in `packages/cli/tests/hub-cwl.test.ts`.

## Non-goals

- Package/export namespaces (all routes share one WebIR module).
- Importing non-CWL sources.
- Emitting multi-file CWL from WebIR (single-file projection unchanged).
