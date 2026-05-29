# hub-gold-js-rich (G137)

Gold fixture proving the JavaScript hub lift extracts **request fields** and
**response status** into the CWL projection — the data the projection needs for
`withStatus` / `withParams` / `withParamDefaults` coverage.

## What it exercises

| Route | Construct | Projects to |
| --- | --- | --- |
| `GET /items/:id` | `req.params.id` | path param `id`, JSON object body |
| `PUT /items/:id` | `req.params.id` | path param `id`, JSON object body |
| `PATCH /items/:id` | `req.params.id` | path param `id`, JSON object body |
| `GET /users/:userId` | `req.params.userId` (bare return) | path param `userId`, `text/plain` |
| `GET /search` | `req.query.q ?? ""` | query param `q` with default `""` |
| `POST /items` | `res.status(201).json(...)` | status `201`, JSON object body |
| `POST /notify` | `res.status(202).json(...)` | status `202`, JSON object body |

## Lift support (DESIGN D436)

`javascript-ast-ingest.mjs` lowers:

- `req.params.<name>` / `req.params["name"]` → `data.request.field` source `path`
- `req.query.<name>` / `req.query["name"]` → `data.request.field` source `query`
- `<field> ?? <literal>` → `data.binop` `??` (carries the CWL default)
- `res.status(n).json(...)` / `res.status(n)....` → `effect.http.error` status

The resulting WebIR projects (via `listCwlRoutes`) to a hole-free CWL contract
with `withStatus: 2`, `withParams: 3` (routes), `withParamDefaults: 1`. The CWL
emit (`emit-cwl-from-hub`) renders it faithfully and round-trips.

Verified by `packages/cli/tests/hub-strategic.test.ts` ("JavaScript lift
extracts request params + status into a rich CWL projection (G137)").
