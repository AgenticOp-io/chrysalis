# hub-gold-roda

Ruby **Roda** origin fixture: shallow `r.get|post|… "path"` (+ `String` / `:id`
matchers) + bare Hash / scalar returns + `response.status = N` + `r.params`.

- Same 20-route express-depth API surface as Sinatra flagship / Chi / Fiber golds.
- **Secondary dialect (G10022 / D6484):** does not replace Sinatra `hub-flagship-ruby` D6448-ST.
- Nested `r.on` trees / plugin auth / multi-file apps stay honest unsupported
  shapes (**D6447** — not present in this gold; do not invent Roda plugin runtime).
- Hole-free lift smoke: `pnpm run hub:roda-smoke`

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| Nested `r.on` / `r.is` trees | not lowered |
| Multi-file route modules | not lowered |
| Auth / session / csrf plugins | not lowered |
| Non-literal / regexp matchers | not lowered |
| Rails secondary (G10006) | skipped — see `rails-controller-honest-skip.json` |
