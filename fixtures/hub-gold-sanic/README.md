# hub-gold-sanic

Gold fixture for **Sanic** as a Python secondary dialect (secondary to Flask
`hub-flagship-python` D6448-ST). Route surface only — no middleware / Blueprint /
listener invent (**D6447**). G10033 / D6495.

## Files

- `app.py` — 20 Sanic routes: `@app.get|post|…`, `@app.route`, `<id>` / `<id:str>`
  paths, `request.args.get`, `json()` / `text()` (+ `status=`).

## Smoke

```bash
pnpm run hub:sanic-smoke
```

Expect 20/20 hole-free CWL projection.

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| Middleware / listeners / signals | not lowered |
| Blueprint registration | not lowered |
| WebSocket / streaming | not lowered |
| `response=` / custom HTTPResponse wrappers | not lowered |
| Cross-file Blueprint modules | not lowered |
