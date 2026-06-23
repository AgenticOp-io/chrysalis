# CWL RFC-0017 — Native UI v0 (server element tree)

**Status:** accepted (2026-06-22)  
**Tracking:** G7101, G7111, DESIGN D6207  
**Extends:** [RFC-0012](CWL-RFC-0012-full-stack-components.md) (component holes), [RFC-0010](CWL-RFC-0010-full-stack-pages.md) (`@page`)

## Summary

Phase **15** adds **native CWL UI** for **server-rendered element trees** on `@page` routes. v0 is **not** hydration, client islands, or Svelte/React lowering — it replaces `return html "..."` string soup with a structured `return ui { … }` block that lowers to WebIR `data.ui.tree` and renders escaped HTML at runtime.

## Syntax

```cwl
@page GET "/ui-v0"
page ui_v0_demo {
  effects: none;
  return ui {
    element "main" class "demo" {
      element "h1" { text "CWL UI v0"; }
      element "p" { text "Server-rendered tree."; }
    }
  };
}
```

Path/query/load bindings in `text` (same identifier rules as RFC-0014):

```cwl
@page GET "/hello/:name"
page hello {
  effects: none;
  param name;
  return ui {
    element "main" {
      element "h1" { text name; }
    }
  };
}
```

| Construct | Meaning |
| --- | --- |
| `return ui { … };` | Server UI tree root (page routes only in v0) |
| `element "tag" [attr value]… { … }` | HTML element; static attr values are quoted literals; bare identifiers match `param` / `query` / `load` keys |
| `text "literal";` | Static text child (HTML-escaped at runtime) |
| `text binding;` | Dynamic text child (HTML-escaped) |

## WebIR lowering

- `return ui` lowers to **`data.ui.tree`** with serialised nodes in `attrs.nodes` and `operands` for dynamic text/attr expressions (`data.request.field`, `data.param` for load keys).
- Page responses wrap the tree in `web.request.response` with `kind: html` and `text/html; charset=utf-8`.
- Unsupported UI (client islands, component calls, `{#each}`) remains a **hole** — no silent lowering.

## Verify

- Fixture: `fixtures/hub-gold-cwl-ui-v0`
- Suites: `cwl-ui-v0-hono`, `cwl-ui-v0-fastify` (structural + trace replay)
- Smokes: `pnpm run hub:cwl-phase15-entry-smoke` (**G7101**), `pnpm run hub:cwl-ui-v0-smoke` (**G7111**)

## WISP `/login` bridge (Phase 15 policy)

WISP `/login` may remain a **documented chimera bridge** until a native login form ships under this RFC. Do not silently lower `hub-svelte:page-component` on `/login` without an explicit hole or native `return ui` route in `routes.cwl`.

## Non-goals (v0)

- Client hydration, stores, client-only routing
- `@component` definitions and cross-route reuse (queued v0.1+)
- Svelte/React/Vue component import
- Expression syntax inside `text` (identifiers only)
