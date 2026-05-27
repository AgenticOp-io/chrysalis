# CWL RFC 0002 — Path parameters

**Status:** accepted (2026-05-26)  
**ROADMAP:** G79  
**DESIGN:** D384

## Summary

Promote `:id` path templates from Express, Flask, Gin, and Spring into CWL route paths with typed `pathParams` in WebIR. Handlers declare `param name;` and may reference path params in object returns.

## Syntax

```cwl
@route GET "/items/:id"
handler item_show {
  effects: none;
  param id;
  return { ok: true, id: id };
}
```

| Part | WebIR |
| --- | --- |
| `"/items/:id"` on `@route` | `web.request.route` `path` + `pathParams[{ name: "id", type: string }]` |
| `param id;` | Validates binding against path template |
| `id: id` in `return { … }` | `data.requestField({ source: "path", name: "id" })` |

## Extraction rules

- Segment names match `:([a-zA-Z_][a-zA-Z0-9_]*)`.
- Order preserved; duplicates in one path are deduplicated.
- `param` must name a segment present in the path or ingest emits `cwl:param-not-in-path:<name>` hole.

## Implementation

- **`hub-cwl-path-params.mjs`**: `extractPathParamsFromCwlPath`, `cwlPathParamsForWebir`
- **`cwl-parser.mjs`**: `pathParams` on routes; `param` lines; `parseCwlReturnValue` object fields
- **`cwl-ingest.mjs`**: `lowerObjectEntriesBody` with path param refs
- **`hub-lift-webir-route.mjs`**: passes `pathParams` on route attrs

## Verification

- Structural: **`cwl-path-params-hono`**, **`cwl-path-params-fastify`**
- Fixture: **`fixtures/hub-gold-cwl-path-params/routes.cwl`**

## Non-goals

- Optional segments, regex routes, or `{id}` OpenAPI brace syntax in CWL paths (use `:id` only).
