# hub-gold-padrino

Ruby **Padrino** origin fixture: `Padrino.configure_apps` + `class HubApp < Padrino::Application`,
flat Sinatra-compatible `get|post|… "/path"`, `/:id` templates, bare Hash returns, `status N`,
`params["…"]`.

- Same 20-route express-depth API surface as Sinatra flagship / Roda / Grape golds.
- **Secondary dialect (G10062 / D6524):** does not replace Sinatra `hub-flagship-ruby` D6448-ST.
- Flat routes reuse Sinatra peels in `ruby-ast-ingest.mjs` (no new dialect invent; same cheap
  path as Grape G10032).
- Symbol controllers (`get :index`), `Padrino.mount`, filters/helpers stay honest unsupported
  shapes (**D6447** — not present in this gold).
- Hole-free lift smoke: `pnpm run hub:padrino-smoke`
- Rails secondary stays skipped (G10006). Roda (G10022) + Grape (G10032) remain closed.

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `App.controllers { get :index … }` symbol maps | not lowered |
| `Padrino.mount("App").to("/")` multi-app | not lowered |
| before/after filters / helpers / rendering | not lowered |
| Nested controller namespaces | not lowered |
| Rails secondary (G10006) | skipped — see `rails-controller-honest-skip.json` |
