# hub-gold-http4k

Gold fixture for **http4k** as a Kotlin secondary dialect (secondary to Spring
`hub-flagship-kotlin` D6448-ST). Route surface only — no filters / lenses /
auth / server-backend invent (**D6447**). G10024 / D6486.

## Files

- `app.kt` — 20 http4k routes: `"path" bind Method.GET|POST|… to { … }`,
  `{id}` paths, `req.path` / `req.query`, `Response(OK|CREATED|ACCEPTED).body`.

## Smoke

```bash
pnpm run hub:http4k-smoke
```

Expect 20/20 hole-free CWL projection.

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `Filter` / `then` middleware chains | not lowered |
| Body/Header/Query **lenses** beyond `req.path` / `req.query` | not lowered |
| Nested `routes(` / contract routing DSL | not lowered |
| Server backends (Jetty/Netty/…) | not lowered |
| Non-literal path templates | not lowered |
