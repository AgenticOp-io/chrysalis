# hub-gold-elysia

Secondary TypeScript/JS dialect fixture: **Elysia** —
`new Elysia()` + `app.get|post|…` + `ctx.params` / `ctx.query` /
IDENT-safe `{ params: { id } }` / `{ query: { q } }` + `ctx.set.status` +
object/literal returns, plus empty lifecycle pass-through (G10025 / G10053).

- Same 20-route express-depth API surface as `hub-flagship-express` /
  `hub-gold-hono` / `hub-gold-koa`.
- Express/TypeScript remain the JS/TS D6448-ST flagships; this is a secondary
  dialect smoke (not ST).
- Prove hole-free lift: `pnpm run hub:elysia-smoke` (20 routes + 2 middleware presets)
- Empty `app.onRequest(() => {})` / `app.onBeforeHandle(() => {})` peels as
  `js.passthrough` (**D6447** — no invented onion; parallel to G10044 / G9959).
- Elysia `.use(plugin)` is **plugin-shaped** (Elysia instance / `(app) => app`),
  **not** `(ctx, next)` middleware — leave as honest hole (do not invent).

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `app.use` / `.use(plugin)` / Elysia plugins | not lowered (honest hole — not pass-through-shaped) |
| Non-empty `onRequest` / `onBeforeHandle` / other lifecycle + options/`as` scopes | middleware root + honest hole body |
| Macros / `.macro` / derived context | not lowered |
| Named handler refs / `app.group` nesting / `prefix` | not lowered |
| Non-literal path templates | not lowered |
| Nested/computed/rest destructure beyond IDENT bag fields | not lowered |
