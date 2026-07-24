# hub-gold-openapi-cwl

Gold fixture for **OpenAPI 3.x → CWL import** (the Stage-B "Sink"; `STRATEGIC-PLAN.md`
Phase 3, **G139**). It proves Chrysalis can ingest an *external* API contract into
CWL/WebIR — the reverse of `hub-cwl-openapi-export` — so a migration can start from a
published spec, not only from lifted source.

## Files

- `openapi.json` — a small, hand-written OpenAPI 3.0.3 contract (7 operations) that
  exercises every importable surface feature.
- `routes.cwl` — the generated CWL, produced by
  `node scripts/hub-ingest/hub-openapi-to-cwl.mjs --openapi openapi.json --module items_mini`.

## What it exercises

| OpenAPI construct | CWL projection |
| --- | --- |
| `/items/{id}` path template | `@route ... "/items/:id"` + `param id;` |
| query param with `schema.default` | `query q = "";` |
| `in: header` IDENT-safe name | `header authorization;` |
| flat `requestBody` example keys | `body name = "widget";` |
| `201` / `204` success responses | `status 201;` / `status 204;` |
| response `content` media type | `content-type "application/json";` |
| flat JSON response `example` | `return { ... };` (object body) |
| `204` no content | `return "";` |
| declared content but **no example** | honest `hole openapi:no-response-body;` (surface kept) |

## Honesty boundary

A concrete `return` body is emitted **only** when the contract supplies a flat response
example. When the response body is unspecified (schema-only, no example), the importer
emits a **hole** (`openapi:no-response-body`) rather than inventing a value — and keeps
the known route surface (status, content-type, params) alongside the hole. Nested/non-flat
examples become `openapi:nested-response-body` for the same reason.

## Round-trip

`routes.cwl` re-ingests through `cwl-ingest` (`lift-to-webir --language cwl`) to WebIR.
The resulting `summarizeCwlProjection` is **6/7 hole-free** (only `/raw` is a hole),
`withStatus: 2`, `objectBodies: 5`, `withContentType: 6`. `withParams` is `0` at the
projection level because the example bodies are literals that do not *reference* the
declared params (the route surface still carries them); the importer's own report counts
the declared `withParams: 3`. Asserted by the **G139** case in
`packages/cli/tests/hub-strategic.test.ts`.
