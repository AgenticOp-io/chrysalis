# hub-gold-aiohttp

Gold fixture for **aiohttp** as a Python secondary dialect (secondary to Flask
`hub-flagship-python` D6448-ST). Route surface only — no middleware / subapp /
WebSocket invent (**D6447**). G10039 / D6501.

## Files

- `app.py` — 20 aiohttp routes: `web.Application()`, `web.get|post|…`, `{id}` /
  `{id:\d+}` paths, `request.match_info`, `request.query.get`,
  `web.json_response` / `web.Response`.

## Smoke

```bash
pnpm run hub:aiohttp-smoke
```

Expect 20/20 hole-free CWL projection.

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| Middleware / signals | not lowered |
| Subapp / nested Application mount | not lowered |
| WebSocket / streaming | not lowered |
| `web.View` class-based handlers | not lowered |
| Cross-file named handlers | not lowered |
| `app.router.add_*` without `web.get|post` | not lowered |
