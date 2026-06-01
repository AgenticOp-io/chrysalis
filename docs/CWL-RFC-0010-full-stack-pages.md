# CWL RFC-0010 — Full-stack page surface

**Status:** accepted (2026-06-01)  
**Tracking:** G1143, DESIGN D1143

## Motivation

CWL must express **both** API handlers and user-facing HTML/SSR pages in one module so migrations and greenfield apps can be authored as a single contract. This RFC adds an explicit **page** surface alongside existing **handler** (API) routes.

## Syntax

```cwl
@page GET "/"
page home {
  effects: none;
  return html "<h1>Home</h1>";
}
```

| Construct | Meaning |
| --- | --- |
| `@page METHOD "path"` | Declares a page route (same methods as `@route`) |
| `page name { ... }` | Page body block (parallel to `handler`) |
| `return html "...";` | HTML response body; sets default `content-type` to `text/html; charset=utf-8` |

API routes remain `@route` + `handler` unchanged.

## WebIR lowering

- Page routes lower through the same `web.request.route` + handler body path as API routes.
- `return html` lowers to a string literal with `web.request.response` kind `html` and `text/html; charset=utf-8` unless overridden.
- Unsupported page semantics (components, SSR data loaders, client hydration) remain **holes** until a later RFC.

## Verify

- Gold fixture: `fixtures/hub-gold-cwl-fullstack`
- Suites: `cwl-fullstack-hono`, `cwl-fullstack-fastify` (structural + trace replay)
- Smoke: `pnpm run hub:cwl-fullstack-smoke`

## Non-goals (this RFC)

- Svelte/React/Vue component trees
- Client-side hydration or asset pipelines
- Production SSR data loading
