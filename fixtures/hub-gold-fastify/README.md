# hub-gold-fastify

Secondary TypeScript/JS dialect fixture: **Fastify** `fastify.get|post|…` +
`reply.send` / `reply.code(n).send` / `req.params` / `req.query`.

- Same 20-route express-depth API surface as `hub-flagship-express` / `hub-flagship-typescript`.
- Express remains the JS/TS D6448-ST flagship; this is a secondary dialect smoke (not ST).
- Prove hole-free lift: `pnpm run hub:fastify-smoke`
- Distinct from `@chrysalis/emit-fastify` (WebIR → Fastify emit target).
- No invented product UI (**D6447**).

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `fastify.register` / plugins / encapsulate trees | not lowered |
| `addHook` / `onRequest` / schema validators | not lowered |
| Non-literal path templates | not lowered |
| Destructure-only `request` alias without `req`/`request` bag peels beyond bags | `request.*` bags supported; other shapes hole |
