# hub-gold-tornado

Tornado Python secondary dialect gold (not D6448-ST). Flask remains Python flagship.

- **Gate:** `pnpm run hub:tornado-smoke` (20/20 hole-free)
- **Peels:** `tornado.web.Application([(r"/path", Handler), …])` + class `get|post|…`, `(?P<id>[^/]+)` / `([^/]+)` paths, `self.get_argument`, `self.write` / `self.set_status`
- **Honest holes:** RequestHandler mixins, UIModule, `@tornado.gen.coroutine` / async onion, `url()` wrappers, cross-file handlers (**D6447**)
