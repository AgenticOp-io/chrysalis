# hub-gold-quart

Gold fixture for **Quart** as a Python secondary dialect (secondary to Flask
`hub-flagship-python` D6448-ST). Quart is the Flask-async twin — route surface
reuses Flask peels (`@app.get|post|…`, `<id>` paths, `request.args`, status
tuples). No middleware / websocket / Blueprint invent (**D6447**). G10026 / D6488.

## Files

- `app.py` — 20 Quart async routes mirroring Flask flagship shapes.

## Smoke

```bash
pnpm run hub:quart-smoke
```

Expect 20/20 hole-free CWL projection.

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| Middleware / `before_request` / ASGI onion | not lowered (no invent) |
| WebSocket / streaming channels | not lowered |
| Blueprint register beyond same-file cheap | not lowered |
| Cross-file Blueprint modules | not lowered |
