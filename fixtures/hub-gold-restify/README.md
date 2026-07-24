# hub-gold-restify

Secondary TypeScript/JS dialect fixture: **Restify** —
`server.get|post|put|patch|del` + `res.send` / Restify `res.send(code, body)` +
`req.params` / `req.query`, plus pass-through `server.pre` / `server.use` (G9959).

- Same 20-route express-depth API surface as `hub-flagship-express` /
  `hub-flagship-typescript` / `hub-gold-fastify` / `hub-gold-koa` / `hub-gold-hapi`.
- Express/TypeScript remain the JS/TS D6448-ST flagships; this is a secondary
  dialect smoke (not ST — thinner than Nest decorator surface).
- Prove hole-free lift: `pnpm run hub:restify-smoke` (20 routes + 2 middleware presets)
- Pass-through `pre`/`use` peel as `restify.passthrough` / `js.passthrough`
  (**D6447** — no invented plugins / body-parser runtime).

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| Non-empty / complex `server.pre` / `server.use` bodies | middleware root + honest hole body |
| `server.on('after'|…)` lifecycle | not lowered |
| Restify plugins (`plugins.queryParser`, bodyParser, …) | not lowered |
| Named handler refs / `next.ifError` | not lowered |
| Non-literal path templates | not lowered |
| Destructure `const { id } = req.params` without member peels | not lowered |
