# hub-gold-hono

Secondary TypeScript/JS dialect fixture: **Hono** —
`new Hono()` + `app.get|post|…` + `c.req.param` / `c.req.query` + `c.json` /
`c.text` (G10019).

- Same 20-route express-depth API surface as `hub-flagship-express` /
  `hub-flagship-typescript` / `hub-gold-koa` / `hub-gold-polka`.
- Express/TypeScript remain the JS/TS D6448-ST flagships; this is a secondary
  dialect smoke (not ST).
- **≠ `@chrysalis/emit-hono`** — this is **ORIGIN** lift of Hono TypeScript
  source, not the WebIR→Hono emit target.
- Prove hole-free lift: `pnpm run hub:hono-smoke` (20 routes)
- Middleware (`app.use`, Hono middleware helpers) is **not** peeled — honest
  holes only (**D6447** — no invented onion runtime).

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `app.use` / Hono middleware helpers (`logger`, `cors`, …) | not lowered (honest hole) |
| `c.req.header` / `c.req.parseBody` / cookies / streaming | not lowered |
| `c.json(body, { status })` ResponseInit object form | numeric 2nd-arg status only |
| Named handler refs / `app.route` nesting / `basePath` | not lowered |
| Non-literal path templates | not lowered |
| Nested/computed/rest destructure from param/query bags | not lowered |
