# hub-gold-litestar

Gold fixture for **Litestar** as a Python secondary dialect (secondary to Flask
`hub-flagship-python` D6448-ST). Route surface only — no Provide / DI /
middleware / Controller invent (**D6447**). G10021 / D6483.

## Files

- `app.py` — 20 Litestar routes: bare `@get|post|…`, `{id}` paths,
  `request.query_params.get`, `status_code=` on decorator.

## Smoke

```bash
pnpm run hub:litestar-smoke
```

Expect 20/20 hole-free CWL projection.

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `Provide` / DI dependencies | not lowered (no invent) |
| Middleware / guards / hooks | not lowered |
| Class `Controller` route handlers | not lowered |
| `Response` / `MediaType` wrappers | not lowered |
| WebSocket / channels | not lowered |
