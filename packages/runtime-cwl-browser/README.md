# @chrysalis/runtime-cwl-browser

## Purpose

**Browser runtime** for CWL **client islands** (RFC-0019). Parses island metadata from server HTML, binds declarative `data-cwl-on-*` handlers — **no hydration execution** until RFC-0019 v2 + verify gold.

## Public API

- `CWL_BROWSER_RUNTIME_KIND` — artifact kind constant
- `discoverClientIslands(document)` — find `data-cwl-island="client"` roots
- `readIslandEventBindings(el)` — read `data-cwl-on-*` attributes
- `bindClientIslandEvents(islands, dispatch)` — wire declarative handlers
- `mountCwlClientIslands(dispatch, root?)` — discover + bind
- `createCwlBrowserRuntime({ dispatch, root? })` — mount/unmount handle

## Invariants

- **Metadata + declarative binding only** — no hydration, no silent framework lowering
- Verify-backed HTML remains authoritative for server behavior

## Non-goals

- Replacing `@chrysalis/runtime-cwl` Node simulator
- Production client state stores without verify gold
