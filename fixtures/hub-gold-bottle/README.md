# hub-gold-bottle

Gold fixture for **Bottle** as a Python secondary dialect (secondary to Flask
`hub-flagship-python` D6448-ST). Route surface only — no plugins / middleware /
hooks invent (**D6447**). G10027 / D6489.

## Files

- `app.py` — 20 Bottle routes: bare `@get|post|…`, `@route(..., method=)`,
  `<id>` paths, `request.query.q` / `request.params`, dict/string /
  `HTTPResponse(..., status=)`.

## Smoke

```bash
pnpm run hub:bottle-smoke
```

Expect 20/20 hole-free CWL projection.

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| Plugins / `install()` | not lowered (no invent) |
| Middleware / hooks / `before_request` | not lowered |
| Templates / `template()` / views | not lowered |
| Multi-app / `Bottle()` mount / `merge` | not lowered |
| Non-literal `method=` / dynamic paths | not lowered |
