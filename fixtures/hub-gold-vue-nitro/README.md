# hub-gold-vue-nitro

Secondary Vue/Nuxt dialect fixture: **Nitro/h3** `server/api/**` + `defineEventHandler` /
`getRouterParam` / `getQuery` / `setResponseStatus` / `(await) readBody(event).field`,
plus `server/middleware` (root + nested) as global middleware presets.

- Same 20-route express-depth API surface as `hub-flagship-vue` (Express-in-SFC remains the D6448-ST flagship).
- Middleware: `server/middleware/00.log.ts` + nested `server/middleware/api/01.guard.ts` (Nitro-global; nested dir ≠ mount).
- Prove hole-free lift: `pnpm run hub:vue-nitro-smoke`
- No invented product UI (**D6447**).

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `const body = await readBody(event); body.x` (binding) | `hub-js:member-expression` / handler hole |
| Whole-body `return await readBody(event)` without `.field` | `hub-js:call-expression` |
| Non-empty middleware with unsupported h3 helpers | `hub-nuxt:nitro-middleware` |
| Path-scoped middleware via `event.path` checks | not modeled as mounts (global `*`) |
| `getCookie` / `getRequestHeader` depth | not lowered yet |
