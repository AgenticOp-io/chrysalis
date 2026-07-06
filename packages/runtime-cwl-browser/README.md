# @chrysalis/runtime-cwl-browser

## Purpose

**Browser runtime scaffold** for CWL **client islands** (RFC-0019). Parses island metadata from server HTML and exposes a stable contract for future hydration — **no client JS execution in Phase 46 entry**.

## Public API

- `CWL_BROWSER_RUNTIME_KIND` — artifact kind constant
- `discoverClientIslands(document)` — find `data-cwl-island="client"` roots
- `readIslandEventBindings(el)` — read `data-cwl-on-*` attributes

## Invariants

- **Metadata only** in Phase 46 — no hydration, no silent framework lowering
- Verify-backed HTML remains authoritative for server behavior

## Non-goals

- Replacing `@chrysalis/runtime-cwl` Node simulator
- Production client state stores without verify gold
