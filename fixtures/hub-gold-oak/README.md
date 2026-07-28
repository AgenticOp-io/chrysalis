# hub-gold-oak

Secondary TypeScript/JS dialect fixture: **Oak** (Deno) —
`new Application()` + `router.get|post|…` + `:id` / `{id}` path templates +
`ctx.params` + `ctx.request.url.searchParams` + `ctx.response.body` /
`ctx.response.status` (G10043).

- Same 20-route express-depth API surface as `hub-flagship-express` /
  `hub-gold-hono` / `hub-gold-elysia` / `hub-gold-koa`.
- Express/TypeScript remain the JS/TS D6448-ST flagships; this is a secondary
  dialect smoke (not ST).
- Prove hole-free lift: `pnpm run hub:oak-smoke` (20 routes)
- Middleware (`app.use`, `router.routes()` / `allowedMethods` onion) is **not**
  peeled — honest holes only (**D6447** — no invented middleware runtime).

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `app.use` / `router.routes()` / `allowedMethods` onion | not lowered (honest hole) |
| `ctx.request.body` / headers / cookies / streaming | not lowered |
| Named handler refs / nested `Router` prefix | not lowered |
| Non-literal path templates | not lowered |
| Nested/computed/rest destructure from params | not lowered |
