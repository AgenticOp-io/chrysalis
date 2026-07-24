# hub-gold-dart-shelf

Dart **Shelf** + **shelf_router** foundation fixture: `router.get|post|put|patch|delete('/path', …)`
+ `Response.ok` / `Response(status, body: …)` + `jsonEncode` + `request.url.queryParameters`
+ `jsonDecode(await request.readAsString())` body peels + `<id>` path params.

- Same 20-route express-depth API surface as Express/Axum/Elixir golds.
- Prove hole-free lift: `pnpm run hub:dart-smoke`
- No Flutter / Dart Frog / shelf_static / middleware pipeline invent (**D6447**).
- Not D6448-ST — foundation smoke only until a Dart flagship prove path is honest.

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `Pipeline()` / middleware cascades | not lowered |
| Named handler refs (`router.get('/x', myHandler)`) | not lowered |
| `Router.mount` / nested routers | not lowered |
| Flutter widgets / Dart Frog `Route` | not lowered |
| Non-literal path templates / `router.all` | not lowered |
| Streaming / `HijackCallback` bodies | not lowered |
