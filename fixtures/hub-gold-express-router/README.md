# hub-gold-express-router

Express **Router mount peel** fixture (G10067 / D6529):
`express.Router()` + `router.get|post|…` + `app.use('/api', router)` literal path join.

- Same 20-route express-depth API surface as `hub-flagship-express`, mounted under `/api`
  (joined paths: `/api/health`, `/api/items/:id`, …).
- Empty `app.use((_req, _res, next) => next())` peels as `js.passthrough` (G9959).
- Express/TypeScript remain the JS/TS D6448-ST flagships; this proves mount path join
  (not a new dialect ST).
- Prove hole-free lift: `pnpm run hub:express-router-smoke` (20/20)

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `app.use('/prefix', router)` + literal `router.get\|post` | peeled (path join) |
| empty/next-only `app.use` | peeled as `js.passthrough` (G9959) |
| `app.use(prefix, mw, router)` / complex function middleware | not lowered (honest hole) |
| non-literal mount prefix / non-literal route paths | not lowered |
| nested `router.use('/sub', subRouter)` beyond cheap | not lowered |
