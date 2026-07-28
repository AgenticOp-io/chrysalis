# hub-gold-vapor-group

Swift **Vapor** `app.grouped("prefix")` path-join gold (G10069 / D6531).

- Same 20-route express-depth API surface as `hub-flagship-swift`, registered via
  literal `grouped` prefixes (`let api = app.grouped("api")`, nested
  `api.grouped("items")`, chained `app.grouped("api").get(...)`).
- Does **not** replace Vapor flagship D6448-ST; deepens peel only when PathComponent
  args are string literals (**D6442**).
- Hummingbird secondary (`hub:hummingbird-smoke`) must stay green; Hummingbird
  `router.group` remains an honest hole.
- Fluent / Leaf / auth middleware stay honest unsupported shapes (**D6447**).
- Hole-free lift smoke: `pnpm run hub:vapor-group-smoke`

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `grouped(Middleware…)` / non-literal PathComponents | not lowered |
| Fluent models / migrations | not lowered |
| Leaf templates / view rendering | not lowered |
| Auth / session middleware chains | not lowered |
| Hummingbird `router.group` | not lowered (separate dialect) |
| Non-literal route path templates | not lowered |
