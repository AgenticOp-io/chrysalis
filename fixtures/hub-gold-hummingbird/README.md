# hub-gold-hummingbird

Swift **Hummingbird** `Router` origin fixture: `router.get|post|…('/path')`
+ dict / scalar returns + `context.parameters.get` + `request.uri.queryParameters`
+ `Response(status: .created|.accepted, body: HTTPBody(json: …))`.

- Same 20-route express-depth API surface as Vapor flagship / Dart Shelf golds.
- **Secondary dialect (G10016):** does not replace Vapor `hub-flagship-swift` D6448-ST.
- Fluent / Leaf / auth middleware / nested `router.group` runtime stay honest unsupported
  shapes (**D6447** — not present in this gold; do not invent Fluent/Leaf runtime).
- Hole-free lift smoke: `pnpm run hub:hummingbird-smoke`

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `router.group` / nested routers | not lowered |
| Fluent models / migrations | not lowered |
| Leaf templates / view rendering | not lowered |
| Auth / session middleware chains | not lowered |
| Wildcard `/*` / `/**` routes | not lowered |
| Non-literal path templates | not lowered |
