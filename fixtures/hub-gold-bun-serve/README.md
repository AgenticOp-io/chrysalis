# hub-gold-bun-serve

Secondary TypeScript/JS dialect fixture: **Bun.serve** —
`Bun.serve({ routes: { "/path": { GET|POST|…: handler } } })` + `req.params` +
`new URL(req.url).searchParams` + `Response.json` / `Response.json(body, { status: N })`
(G10048).

- Same 20-route express-depth API surface as `hub-flagship-express` /
  `hub-gold-hono` / `hub-gold-elysia` / `hub-gold-oak`.
- Express/TypeScript remain the JS/TS D6448-ST flagships; this is a secondary
  dialect smoke (not ST).
- Prove hole-free lift: `pnpm run hub:bun-serve-smoke` (20 routes)
- `fetch` fallback, websocket, plugins, and static `Response`/`Bun.file` route
  values are **not** peeled — honest holes only (**D6447** — no invented Bun
  runtime beyond route peel).

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `fetch` fallback / method+path switch-only servers | not lowered (prefer `routes`) |
| `websocket` / upgrade / plugins | not lowered |
| Static `Response` / `Bun.file` / `Response.redirect` route values | not lowered |
| Named handler refs / non-literal path keys | not lowered |
| Nested/computed/rest destructure beyond `req.params.*` | not lowered |
| Request body / headers / cookies / streaming | not lowered |
