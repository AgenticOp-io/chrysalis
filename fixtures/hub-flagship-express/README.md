# Express flagship pilot (G110)

Twenty-route **Express** app for hub structural + trace gold (javascript origin; 10 baseline + 10 CRUD/search slice).

```bash
node scripts/hub-ingest/lift-to-webir.mjs fixtures/hub-flagship-express --language javascript
node scripts/hub-ingest/hub-gold-verify.mjs --suite express-flagship-hono
pnpm run hub:express-flagship
```

Handlers are literal, `res.json({...})`, or (since **G137**) request-field shapes:
the param routes (`/items/:id` GET/PUT/PATCH, `/users/:userId`, `/search`) use
`req.params.*` / `req.query.* ?? ...` and the status routes (`POST /items` 201,
`POST /notify` 202) use `res.status(n).json({...})`. Since **G138** the runtime
hono/fastify emit returns real JSON bodies and applies the response status
(buffered JSON + `__respond` when a status effect is present, else direct
`c.json(...)`), and `oracle/app-live.js` mirrors the emitted runtime exactly, so
trace replay validates real bodies/status. The projection reports `withStatus: 2`,
`withParams: 5`, `withParamDefaults: 1`, `objectBodies: 8`, still **hole-free**.
Trivial literal routes (`/items`, `/stats`, `DELETE /items/:id`) stay empty
(discarded bare returns) and the oracle keeps them empty to match.
Trace replay probes emitted Hono/Fastify/Next.js in-process (same contract as `hub-gold-js-literal`).

**G112 live oracle:** `src/serve.mjs` + `oracle/app-live.js` serve real HTTP; `src/app.js` stays lift-only (`serve.mjs` / `oracle/` excluded from ingest). Capture + replay:

```bash
pnpm run hub:node-express-oracle-verify
```
