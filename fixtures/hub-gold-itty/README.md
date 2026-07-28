# hub-gold-itty

Secondary TypeScript/JS dialect fixture: **itty-router** (Workers-style) —
`Router()` + `router.get|post|…` + `:id` path params via `request.params` +
query from `new URL(request.url).searchParams` / bound `url.searchParams` +
`json()` / `Response.json` / `new Response` (G10047) + empty `router.all('*', () => {})`
pass-through peel as `js.passthrough` (G10064).

- Same 20-route express-depth API surface as `hub-flagship-express` /
  `hub-gold-hono` / `hub-gold-elysia` / `hub-gold-oak`.
- Express/TypeScript remain the JS/TS D6448-ST flagships; this is a secondary
  dialect smoke (not ST).
- Prove hole-free lift: `pnpm run hub:itty-smoke` (20 routes + 2 mw presets)
- itty has **no** Express-style `next()` — origin pass-through is empty /
  no-return (`router.all('*', () => {})`). Complex `all` / nested `Router` /
  named handlers stay honest holes (**D6447** — no invented middleware onion).

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| empty `router.all('*', () => {})` | peeled as `js.passthrough` (G10064) |
| non-empty / multi-handler `router.all` / upstream onion | not lowered (honest hole) |
| request body / headers / cookies / streaming | not lowered |
| Named handler refs / nested `Router` prefix | not lowered |
| Non-literal path templates | not lowered |
| Nested/computed/rest destructure from params | not lowered |
