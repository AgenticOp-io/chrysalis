# hub-gold-fastapi

Gold fixture for **FastAPI** as a Python secondary dialect (secondary to Flask
`hub-flagship-python` D6448-ST). Route surface only — no Depends / OAuth /
middleware onion invent (**D6447**).

## Files

- `app.py` — 20 FastAPI routes: `@app.get|post|…`, `{id}` paths,
  `request.query_params.get`, `status_code=` on decorator.

## Smoke

```bash
pnpm run hub:fastapi-smoke
```

Expect 20/20 hole-free CWL projection.
