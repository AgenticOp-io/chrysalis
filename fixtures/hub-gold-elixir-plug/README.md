# hub-gold-elixir-plug

Elixir **Plug.Router** foundation fixture: `get|post|put|patch|delete "/path" do … end`
+ `send_resp(conn, status, Jason.encode!(…))` + `conn.params` / `conn.query_params` /
`conn.body_params`.

- Same 20-route express-depth API surface as Express/Axum golds.
- Prove hole-free lift: `pnpm run hub:elixir-smoke`
- No Phoenix LiveView / controller runtime invented (**D6447**).
- Not D6448-ST — foundation smoke only until a Phoenix/Plug flagship prove path is honest.

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| Phoenix `get "/x", Ctrl, :action` controller dispatch | not lowered (no invented LiveView/controller runtime) |
| `plug MyPlug` pipeline plugs beyond `:match`/`:dispatch` | not lowered |
| Nested `case`/`with`/`fn`/`do` inside route bodies | not lowered |
| Non-literal path templates / `forward`/`match` catch-alls | not lowered |
| `put_status` + `json` Phoenix.Controller helpers | not lowered (use `send_resp` + `Jason.encode!`) |
