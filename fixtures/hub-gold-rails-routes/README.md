# hub-gold-rails-routes

Ruby **Rails** route-table fixture: `config/routes.rb` `Rails.application.routes.draw`
with flat `get|post|put|patch|delete "/path", to: "ctrl#action"`, plus thin
`app/controllers/*_controller.rb` actions using `render json:` / `params[:id]`.

- Same 20-route express-depth API surface as Sinatra flagship / Roda / Grape / Nancy golds.
- **Secondary dialect (G10115 / D6540):** unparks G10006 at **route-table + thin render json**
  level only. Does not replace Sinatra `hub-flagship-ruby` D6448-ST.
- No `resources` / `namespace` / `scope` macros; no filters, views, or ActionController invent.
- Hole-free lift smoke: `pnpm run hub:rails-routes-smoke`

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `resources` / `namespace` / `scope` macros | not lowered — honesty catalog G10130 (`hub:rails-filters-honesty-smoke` → `RAILS_FILTERS_HONESTY_OK`) |
| before/after filters / `respond_to` / views | not lowered — honesty catalog G10130 |
| Strong params / ActiveRecord / ActiveJob | not lowered — honesty catalog G10130 |
| Inline rack lambdas in routes.rb | not lowered (G10006 probe) |

Refuse force-close as full Rails filters/AR runtime 20/20 — G10115 route-table remains sole Rails ST gold.
