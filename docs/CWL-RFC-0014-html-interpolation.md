# CWL RFC-0014 — HTML template interpolation

**Status:** accepted (2026-06-01)  
**Tracking:** G1189, DESIGN D1189

## Summary

Bare identifiers in `return html "..."` strings that match declared `param`, `query`, or `load { … }` keys interpolate at runtime via WebIR `data.html.template`.

## Syntax

```cwl
@page GET "/docs/:slug"
page doc_show {
  effects: none;
  param slug;
  return html "<p>slug: slug</p>";
}
```

The second `slug` token is a path-param reference, not literal text.

Load fields become available after `load { … };` executes:

```cwl
load { slug: slug, source: "flagship" };
return html "<p>slug: slug source: source</p>";
```

## WebIR lowering

- Matching identifiers → `data.html.template` with `data.request.field` (path/query) or `data.param` (load keys).
- Interpolations are HTML-escaped at runtime (`escape: true`).

## Verify

- `pnpm run hub:cwl-html-interpolation-smoke`
- `fixtures/hub-flagship-cwl-fullstack` blog/docs routes
- Authoring batch v4 gate

## Non-goals (v1)

- Expression syntax inside HTML strings
- Component slots or partials
- Client-side hydration bindings
