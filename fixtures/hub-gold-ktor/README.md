# hub-gold-ktor

Gold fixture for **Ktor** as a Kotlin secondary dialect (secondary to Spring
`hub-flagship-kotlin` D6448-ST). Route surface only — no auth / plugins /
nested routing invent (**D6447**).

## Files

- `app.kt` — 20 Ktor routes: `routing { get|post|… }`, `{id}` paths,
  `call.parameters`, `call.request.queryParameters`, `HttpStatusCode` on
  `call.respond`.

## Smoke

```bash
pnpm run hub:ktor-smoke
```

Expect 20/20 hole-free CWL projection.
