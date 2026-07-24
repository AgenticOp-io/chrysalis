# hub-gold-polka

Secondary TypeScript/JS dialect fixture: **Polka** —
`app.get|post|…` + Node `res.writeHead(N)` / `res.end(JSON.stringify(…))` +
`req.params` / `req.query`, plus pass-through `app.use` (G9959).

- Same 20-route express-depth API surface as `hub-flagship-express` /
  `hub-flagship-typescript` / `hub-gold-fastify` / `hub-gold-koa` / `hub-gold-hapi`.
- Express/TypeScript remain the JS/TS D6448-ST flagships; this is a secondary
  dialect smoke (not ST — thinner than Nest decorator surface).
- Prove hole-free lift: `pnpm run hub:polka-smoke` (20 routes + 1 middleware preset)
- Pass-through `app.use((_req, _res, next) => next())` peels as `js.passthrough`
  (**D6447** — no invented body-parser / send helpers).

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| Non-empty / complex `app.use` bodies | middleware root + honest hole body |
| Named handler refs / method chaining without Identifier receiver | not lowered |
| Streaming / hijack / `res.write` chunk loops | not lowered |
| Non-literal path templates | not lowered |
| Destructure `const { id } = req.params` without member peels | not lowered |
| Bare `res.end()` with no payload (status-only) beyond gold shapes | status-only peel only |
