# hub-gold-adonis

Secondary TypeScript/JS dialect fixture: **AdonisJS** route surface —
`Route.get|post|…` / `router.get` in `start/routes.ts` + `:id` path params via
`request.param('id')` + query via `request.qs().q` + `response.json` /
`response.status(N).json` (G10059 / D6521).

- Same 20-route express-depth API surface as `hub-flagship-express` /
  `hub-gold-hono` / `hub-gold-itty`.
- Express/TypeScript remain the JS/TS D6448-ST flagships; this is a secondary
  dialect smoke (not ST).
- Prove hole-free lift: `pnpm run hub:adonis-smoke` (20 routes)
- Lucid / IoC containers / controller string refs (`'Controllers/…'`) /
  middleware / named handlers are **not** peeled — honest holes only
  (**D6447** — no invented Lucid/IoC runtime). Cross-file controller refs are
  Rails-class honest-skip territory.

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| Lucid ORM / models / migrations | not lowered (honest hole) |
| IoC container / `@inject` / providers | not lowered |
| Controller string refs / `#controllers/…` | not lowered (Rails-class) |
| Middleware / route groups / auth guards | not lowered |
| Named handler refs / non-literal paths | not lowered |
| Request body / headers / cookies / streaming | not lowered |
