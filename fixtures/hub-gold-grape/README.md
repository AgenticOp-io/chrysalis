# hub-gold-grape

Ruby **Grape** origin fixture: `class API < Grape::API`, flat `get|post|… "/path"`,
`/:id` templates, bare Hash returns (`format :json`), `status N`, `params["…"]`.

- Same 20-route express-depth API surface as Sinatra flagship / Roda golds.
- **Secondary dialect (G10032 / D6494):** does not replace Sinatra `hub-flagship-ruby` D6448-ST.
- Flat routes reuse Sinatra peels in `ruby-ast-ingest.mjs` (no new dialect invent).
- Nested `route_param`, `present` entities, `params do` validation blocks, namespaces
  stay honest unsupported shapes (**D6447** — not present in this gold).
- Hole-free lift smoke: `pnpm run hub:grape-smoke`
- Rails secondary stays skipped (G10006). Roda secondary remains closed (G10022).

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| Nested `route_param :id do … end` | not lowered |
| `present` / entity serializers | not lowered |
| `params do … end` validation DSL | not lowered |
| `namespace` / `prefix` / versioning | not lowered |
| Middleware / auth helpers | not lowered |
| Rails secondary (G10006) | skipped — see `rails-controller-honest-skip.json` |
