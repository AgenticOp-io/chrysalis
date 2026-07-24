# hub-gold-elixir-plug

Elixir **Plug.Router** origin fixture: `get|post|put|patch|delete "/path" do … end`
+ `send_resp(conn, status, Jason.encode!(…))` + `conn.params` / `conn.query_params` /
`conn.body_params`.

- Same 20-route express-depth API surface as Express/Axum/Nest golds.
- **Route-surface Elixir ST (cwl-api):** `pnpm run hub:elixir-flagship` then
  `pnpm run hub:complete-conversion-prove:elixir` → `stGreen`+`stClosed`.
  Phoenix LiveView / controller dispatch / pipeline plugs stay honest unsupported
  shapes (**D6447** — not present in this gold; do not invent Phoenix runtime).
- Hole-free lift smoke: `pnpm run hub:elixir-smoke`

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| Phoenix `get "/x", Ctrl, :action` controller dispatch | not lowered (no invented LiveView/controller runtime) |
| `plug MyPlug` pipeline plugs beyond `:match`/`:dispatch` | not lowered |
| Nested `case`/`with`/`fn`/`do` inside route bodies | not lowered |
| Non-literal path templates / `forward`/`match` catch-alls | not lowered |
| `put_status` + `json` Phoenix.Controller helpers | not lowered (use `send_resp` + `Jason.encode!`) |
| Phoenix LiveView / `live "/…"` | not lowered |
