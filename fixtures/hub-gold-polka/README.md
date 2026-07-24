# hub-gold-polka

Secondary TypeScript/JS dialect fixture: **Polka** —
`app.get|post|…` + Node `res.writeHead(N)` / `res.end(JSON.stringify(…))` +
`req.params` / `req.query`.

- Same 20-route express-depth API surface as `hub-flagship-express` /
  `hub-flagship-typescript` / `hub-gold-fastify` / `hub-gold-koa` / `hub-gold-hapi`.
- Express/TypeScript remain the JS/TS D6448-ST flagships; this is a secondary
  dialect smoke (not ST — thinner than Nest decorator surface).
- Prove hole-free lift: `pnpm run hub:polka-smoke`
- No invented Polka middleware / body-parser / `send` helpers (**D6447**).

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `app.use` middleware chains | not lowered |
| Named handler refs / method chaining without Identifier receiver | not lowered |
| Streaming / hijack / `res.write` chunk loops | not lowered |
| Non-literal path templates | not lowered |
| Destructure `const { id } = req.params` without member peels | not lowered |
| Bare `res.end()` with no payload (status-only) beyond gold shapes | status-only peel only |
