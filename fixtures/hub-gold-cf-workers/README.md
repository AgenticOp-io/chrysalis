# hub-gold-cf-workers

Secondary TypeScript/JS dialect fixture: **Cloudflare Workers fetch export** —
`export default { async fetch(request, env, ctx) { … } }` with
`` switch (`${request.method} ${url.pathname}`) `` + `Response.json` /
`Response.json(body, { status: N })` + `url.searchParams.get` (G10063).

- Same 20-route depth as `hub-flagship-express` / `hub-gold-itty` /
  `hub-gold-bun-serve` (literal `/items/id` stands in for `:id` — dynamic
  segment peel is not cheap on bare fetch).
- Express/TypeScript remain the JS/TS D6448-ST flagships; **itty-router**
  (G10047) remains the Workers *router* secondary; this is the bare fetch-export
  secondary (not ST).
- Prove hole-free lift: `pnpm run hub:cf-workers-smoke` (20 routes)
- KV / D1 / `env` bindings / caches / durable objects / regex path params /
  `URLPattern` are **not** peeled — honest holes only (**D6447** — no invent).

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| KV / D1 / R2 / `env.*` bindings | not lowered (no invent) |
| Dynamic path segments / regex / `URLPattern` | not lowered (prefer itty) |
| Named handler refs / middleware / scheduled | not lowered |
| Request body / headers / cookies / streaming | not lowered |
| Opaque `fetch` without peelable pathname+method | not lowered |
