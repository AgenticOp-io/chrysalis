# hub-gold-openapi-cwl

Gold fixture for **OpenAPI 3.x → CWL import** (the Stage-B "Sink"; `STRATEGIC-PLAN.md`
Phase 3, **G139** / **G10002** / **G10031** / **G10054** / **G10074**). It proves Chrysalis can ingest an *external* API contract into
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
| query param with `schema.example` (no default) | `query limit = 10;` |
| query param schema-only (no default/example) | `query bare;` |
| `in: header` IDENT-safe name | `header authorization;` |
| `in: cookie` IDENT-safe name | `cookie session;` |
| flat `requestBody` example keys | `body name = "widget";` |
| `201` / `204` success responses | `status 201;` / `status 204;` |
| response `content` media type | `content-type "application/json";` |
| response `headers` IDENT-safe + example/default | `response-header location = "/items/1";` |
| flat JSON response `example` | `return { ... };` (object body) |
| `204` no content | `return "";` |
| declared content but **no example** | honest `hole openapi:no-response-body;` (surface kept) |
| hyphenated query / cookie / response-header names | skipped (IDENT-safe only — no invent rename) |
| response header without example/default | skipped (no invent) |

## Honesty boundary

A concrete `return` body is emitted **only** when the contract supplies a flat response
example. When the response body is unspecified (schema-only, no example), the importer
emits a **hole** (`openapi:no-response-body`) rather than inventing a value — and keeps
the known route surface (status, content-type, params) alongside the hole. Nested/non-flat
examples become `openapi:nested-response-body` for the same reason. Query defaults come
from `schema.default` else `example` — never invented when both are absent. Cookie params
and response headers are emitted **only** when declared as IDENT-safe with a concrete
value — never invented when absent.

## Round-trip

`routes.cwl` re-ingests through `cwl-ingest` (`lift-to-webir --language cwl`) to WebIR.
The resulting `summarizeCwlProjection` is **6/7 hole-free** (only `/raw` is a hole),
`withStatus: 2`, `objectBodies: 5`, `withContentType: 6`. Asserted by the **G139** /
**G10031** / **G10054** / **G10074** cases in `packages/cli/tests/hub-strategic.test.ts`.
