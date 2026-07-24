# hub-gold-restify

Secondary TypeScript/JS dialect fixture: **Restify** —
`server.get|post|put|patch|del` + `res.send` / Restify `res.send(code, body)` +
`req.params` / `req.query`.

- Same 20-route express-depth API surface as `hub-flagship-express` /
  `hub-flagship-typescript` / `hub-gold-fastify` / `hub-gold-koa` / `hub-gold-hapi`.
- Express/TypeScript remain the JS/TS D6448-ST flagships; this is a secondary
  dialect smoke (not ST — thinner than Nest decorator surface).
- Prove hole-free lift: `pnpm run hub:restify-smoke`
- No invented Restify plugins / pre handlers / body-parser runtime (**D6447**).

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `server.pre` / `server.use` middleware chains | not lowered |
| `server.on('after'|…)` lifecycle | not lowered |
| Restify plugins (`plugins.queryParser`, bodyParser, …) | not lowered |
| Named handler refs / `next.ifError` | not lowered |
| Non-literal path templates | not lowered |
| Destructure `const { id } = req.params` without member peels | not lowered |
