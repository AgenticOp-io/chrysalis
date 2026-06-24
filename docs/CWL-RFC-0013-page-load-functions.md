# CWL RFC-0013 — Page load / SSR data (draft)

**Status:** accepted (2026-06-01)  
**Tracking:** G1159, DESIGN D1159 (queue)  
**Depends on:** RFC-0010 (`@page`), RFC-0012 (hole catalog)

## Summary

Lower simple SvelteKit **`+page.server.ts`** load functions into WebIR page data semantics, then project to CWL **`@page`** surfaces with honest param/body refs — replacing **`hub-svelte:load-function`** holes where safe.

## Motivation

G1158 catalogues load as a hole. Real full-stack apps need SSR/page data on the critical path. v1 targets **literal returns** and **`params.*`** only (same bar as API `json()` lift).

## Proposed syntax (sketch)

```cwl
@page GET "/blog/:slug"
page blog_show {
  effects: none;
  param slug;
  load { slug: slug, source: "page-server" };
  return html "<h1>Blog</h1>";
}
```

Exact `load { … }` block syntax is **TBD** in G1159; must round-trip through `renderCwlRoutes` and `@chrysalis/runtime-cwl`.

## WebIR mapping (TBD)

- Attach load payload as structured data nodes on the handler body (not a second IR).
- Unsupported load shapes → **`hub-svelte:load-function`** hole (RFC-0012).

## Verify plan (G1159)

- `fixtures/hub-gold-svelte-kit-deep` — load route hole-free after implementation
- `hub:sveltekit-deep-smoke` — budget updated
- G1160 — emit merge + round-trip

## Non-goals (v1)

- Streaming, dependencies, invalidation, form actions
- Client-side hydration contract
- Automatic merge of arbitrary Svelte components

## v2 extensions (Phase 20, G7320)

**Status:** accepted (2026-06-16) — DESIGN D6260

| Feature | Syntax | Lowering |
| --- | --- | --- |
| **Load + UI** | `load { … }` + `return ui { … }` on same `@page` | `__page_load` + `data.ui.tree` in handler block |
| **Load redirect** | `load { redirect: "/path" }` | `effect.redirect` (302) |
| **Load error** | `load { error: 404, message: "Not found" }` | `effect.httpError` |
| **Cookie in load** | `load { sessionId: cookie session_id }` | `data.request.field` source cookie |

Framework ingest targets (structural gold):

- SvelteKit `+page.server.ts` → `load { }` or hole
- Next.js App Router server module → `load { }` or hole

Verify: `fixtures/hub-gold-cwl-data-v2`, gate **G7320**; framework ingest **G7321** (`hub-sveltekit-deep-cwl-export-smoke`, `hub-nextjs-deep-cwl-export-smoke`).
