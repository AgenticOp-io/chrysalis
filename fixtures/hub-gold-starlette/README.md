# hub-gold-starlette

Gold fixture for **Starlette** as a Python secondary dialect (secondary to Flask
`hub-flagship-python` D6448-ST). Route surface only — no Mount / middleware /
ASGI onion invent (**D6447**).

## Files

- `app.py` — 20 Starlette routes: `@app.route(..., methods=[...])`, `{id}` paths,
  `request.query_params.get`, `(body, status)` tuple returns.

## Smoke

```bash
pnpm run hub:starlette-smoke
```

Expect 20/20 hole-free CWL projection.
