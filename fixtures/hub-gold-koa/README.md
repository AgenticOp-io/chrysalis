# hub-gold-koa

Secondary TypeScript/JS dialect fixture: **Koa** (`@koa/router` as `app`) —
`app.get|post|…` + `ctx.body` / `ctx.status` / `ctx.params` / `ctx.query` /
`ctx.request.body`.

- Same 20-route express-depth API surface as `hub-flagship-express` /
  `hub-flagship-typescript` / `hub-gold-fastify` / `hub-gold-nestjs`.
- Express/TypeScript remain the JS/TS D6448-ST flagships; this is a secondary
  dialect smoke (not ST).
- Prove hole-free lift: `pnpm run hub:koa-smoke`
- No invented Koa middleware / DI runtime (**D6447**).

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `app.use` / onion middleware chains | not lowered (catalog only) |
| `ctx.throw` / `ctx.assert` / `ctx.respond = false` | not lowered |
| `ctx.cookies` / `ctx.set` / streaming `ctx.body` | not lowered |
| Non-literal path templates | not lowered |
| Destructure `const { id } = ctx.params` without member peels | not lowered |
