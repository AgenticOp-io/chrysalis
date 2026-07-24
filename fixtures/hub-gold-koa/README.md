# hub-gold-koa

Secondary TypeScript/JS dialect fixture: **Koa** (`@koa/router` as `app`) —
`app.get|post|…` + `ctx.body` / `ctx.status` / `ctx.params` / `ctx.query` /
`ctx.request.body`, plus pass-through `app.use` (G9959).

- Same 20-route express-depth API surface as `hub-flagship-express` /
  `hub-flagship-typescript` / `hub-gold-fastify` / `hub-gold-nestjs`.
- Express/TypeScript remain the JS/TS D6448-ST flagships; this is a secondary
  dialect smoke (not ST).
- Prove hole-free lift: `pnpm run hub:koa-smoke` (20 routes + 1 middleware preset)
- Pass-through `app.use(async (_ctx, next) => { await next(); })` peels as
  `js.passthrough` (**D6447** — no invented onion / DI runtime).

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| Non-empty / complex `app.use` bodies | middleware root + honest hole body |
| `ctx.throw` / `ctx.assert` / `ctx.respond = false` | not lowered |
| `ctx.cookies` / `ctx.set` / streaming `ctx.body` | not lowered |
| Non-literal path templates | not lowered |
| Destructure `const { id } = ctx.params` without member peels | not lowered |
