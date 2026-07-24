# hub-gold-elysia

Secondary TypeScript/JS dialect fixture: **Elysia** —
`new Elysia()` + `app.get|post|…` + `ctx.params` / `ctx.query` /
IDENT-safe `{ params: { id } }` / `{ query: { q } }` + `ctx.set.status` +
object/literal returns (G10025).

- Same 20-route express-depth API surface as `hub-flagship-express` /
  `hub-gold-hono` / `hub-gold-koa`.
- Express/TypeScript remain the JS/TS D6448-ST flagships; this is a secondary
  dialect smoke (not ST).
- Prove hole-free lift: `pnpm run hub:elysia-smoke` (20 routes)
- Plugins / `.use` / lifecycle hooks / macros are **not** peeled — honest
  holes only (**D6447** — no invented plugin/lifecycle runtime).

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `app.use` / `.use(plugin)` / Elysia plugins | not lowered (honest hole) |
| Lifecycle hooks (`onBeforeHandle`, `onAfterHandle`, …) | not lowered |
| Macros / `.macro` / derived context | not lowered |
| Named handler refs / `app.group` nesting / `prefix` | not lowered |
| Non-literal path templates | not lowered |
| Nested/computed/rest destructure beyond IDENT bag fields | not lowered |
