# hub-gold-sinatra-ns

Ruby **Sinatra** namespace prefix peel: `require "sinatra/namespace"` +
`namespace "/api" do … get|post|… "/path" do … end end`.

- Same 20-route express-depth API surface as `hub-flagship-ruby`, with paths joined
  to `/api/...` (G10073 / D6535).
- **Deepens Sinatra D6448-ST** (not a secondary dialect) — Roda/Grape/Padrino remain
  separate secondaries; flat Sinatra flagship unchanged.
- Hole-free lift smoke: `pnpm run hub:sinatra-ns-smoke`
- Rails secondary stays skipped (G10006).

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `namespace` with `:conditions` / non-literal prefix | not lowered |
| Nested helpers / filters inside namespace | not lowered |
| Rack `map '/api'` / invented `base.path` | not lowered |
| Grape `prefix` / `namespace` versioning (G10032) | stays Grape honest hole |
| Rails secondary (G10006) | skipped — see `rails-controller-honest-skip.json` |
