# hub-gold-falcon

Falcon Python secondary dialect gold (not D6448-ST). Flask remains Python flagship.

- **Gate:** `pnpm run hub:falcon-smoke` (20/20 hole-free)
- **Peels:** `app.add_route` + class `on_get|on_post|…`, `{id}` paths, `req.get_param`, `resp.media` / `resp.text` / `resp.status`
- **Honest holes:** hooks, middleware, ASGI onion, sink responders, cross-file resources (**D6447**)
