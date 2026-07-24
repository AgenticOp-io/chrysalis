# hub-gold-dart-shelf

Dart **Shelf** + **shelf_router** origin fixture: `router.get|post|put|patch|delete('/path', …)`
+ `Response.ok` / `Response(status, body: …)` + `jsonEncode` + `request.url.queryParameters`
+ `jsonDecode(await request.readAsString())` body peels + `<id>` path params.

- Same 20-route express-depth API surface as Express/Axum/Elixir golds.
- **Named handlers (G10007):** same-file `router.get('/x', myHandler)` → `Response myHandler(Request …) { … }` (Axum/Go parallel).
- **Route-surface Dart ST (cwl-api):** `pnpm run hub:dart-flagship` then
  `pnpm run hub:complete-conversion-prove:dart` → `stGreen`+`stClosed`.
  Flutter / Dart Frog / Pipeline / mount / cross-file named handlers stay honest unsupported
  shapes (**D6447** — not present in this gold; do not invent Flutter/Frog runtime).
- Hole-free lift smoke: `pnpm run hub:dart-smoke`

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `Pipeline()` / middleware cascades | not lowered |
| Cross-file named handler refs | not lowered |
| `Router.mount` / nested routers | not lowered |
| Flutter widgets / Dart Frog `Route` | not lowered |
| Non-literal path templates / `router.all` | not lowered |
| Streaming / `HijackCallback` bodies | not lowered |
