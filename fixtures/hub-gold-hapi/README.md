# hub-gold-hapi

Secondary TypeScript/JS dialect fixture: **Hapi** —
`server.route({ method, path, handler })` + `request.params` / `request.query` /
`request.payload` + `h.response(…).code(N)`.

- Same 20-route express-depth API surface as `hub-flagship-express` /
  `hub-flagship-typescript` / `hub-gold-fastify` / `hub-gold-koa` / `hub-gold-nestjs`
  (Hapi path params use `{id}` origin syntax).
- Express/TypeScript remain the JS/TS D6448-ST flagships; this is a secondary
  dialect smoke (not ST).
- Prove hole-free lift: `pnpm run hub:hapi-smoke`
- No invented Hapi plugins / auth / lifecycle / toolkit runtime (**D6447**).

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `server.ext` / `onPreHandler` lifecycle | not lowered |
| `server.register` plugins / toolkits | not lowered |
| `auth` / `validate` / `pre` route options | not lowered |
| `method: ['GET','POST']` multi-method | not lowered |
| Non-literal path templates | not lowered |
| Destructure `const { id } = request.params` without member peels | not lowered |
