# CWL RFC-0012 — Full-stack component holes

**Status:** accepted (2026-06-01)  
**Tracking:** G1149, DESIGN D1149

## Summary

Full-stack origins (SvelteKit first) lift **route surfaces** before component/SSR semantics. Unsupported constructs emit **catalogued holes** in WebIR and CWL projection — never silent stubs.

## Hole catalog

| Reason | Origin | Surface | Meaning |
| --- | --- | --- | --- |
| `hub-svelte:page-component` | svelte | page | `+page.svelte` component tree |
| `hub-svelte:server-handler` | svelte | api | `+server.ts` handler when AST lift fails |
| `hub-svelte:load-function` | svelte | data | `+page.server.ts` load (reserved) |
| `hub-svelte:form-action` | svelte | api | form actions (reserved) |

Registry: `scripts/hub-ingest/cwl-fullstack-holes.mjs`.

## CWL projection

Hole routes render as:

```cwl
@route GET "/blog/:slug"
handler blog_slug_page {
  effects: none;
  hole hub-svelte:page-component;
}
```

When HTML body semantics exist, emit uses `@page` + `return html` (RFC-0010).

## Verify plan

- `hub:sveltekit-smoke` — file-route discovery (hole-free gold)
- `hub:sveltekit-deep-smoke` — POST handlers, load holes, Svelte blocks (`hub-gold-svelte-kit-deep`)
- `hub:sveltekit-cwl-export-smoke` — lift → emit CWL
- `hub:cwl-fullstack-flagship-smoke` — CWL-authored flagship + hole budget (G1157)
- `cwl diagnose` — warns on uncatalogued `hole` tokens

## Non-goals (this RFC)

- Hydration, stores, client-only routing
- Vue/React component lowering
- Automatic promotion to matrix gold while holes remain
