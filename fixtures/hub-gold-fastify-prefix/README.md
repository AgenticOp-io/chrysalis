# hub-gold-fastify-prefix

Fastify **encapsulated plugin prefix peel** (G10072 / D6534): literal
`fastify.register(async function (app) { app.get|post|… }, { prefix: '/api' })`
path join → `/api/…`.

- Same 20-route surface as `hub-gold-fastify`, under `/api`.
- Prove hole-free lift: `pnpm run hub:fastify-prefix-smoke`
- Base dialect remains `hub:fastify-smoke` (no register).
- No invented plugin runtime, hooks, or schema validators (**D6447**).

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| Non-literal `prefix` / dynamic opts | not lowered (suppress unprefixed steal) |
| Cross-file / opaque plugin refs | not lowered |
| `addHook` / `onRequest` / schema validators | not lowered |
| Nested register without literal prefixes | not lowered |
| Non-literal path templates | not lowered |
