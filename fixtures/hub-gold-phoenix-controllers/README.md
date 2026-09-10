# hub-gold-phoenix-controllers

Elixir **Phoenix** route-table fixture: `lib/.../router.ex` with flat
`get|post|put|patch|delete "/path", XxxController, :action`, plus thin
`controllers/*_controller.ex` actions using `json/2` / `put_status/2` /
`params["id"]`.

- Same 20-route express-depth API surface as Plug.Router / Rails / Nancy golds.
- **Secondary dialect (G10126 / D6540):** unparks Phoenix controller peel at
  **route-table + thin json** level only. Does not replace Plug.Router
  `hub-gold-elixir-plug` D6448-ST.
- No `live "/…"`, LiveView, pipelines, `resources`, or `scope` invent (**D6447**).
- Hole-free lift smoke: `pnpm run hub:phoenix-controllers-smoke`

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `live "/…"` / LiveView / HEEx / sockets | not lowered — honesty catalog G10128 (`hub:phoenix-liveview-honesty-smoke` → `LIVEVIEW_HONESTY_OK`) |
| `pipeline` / `scope` / custom plugs | not lowered |
| `resources` / `forward` / `match` catch-alls | not lowered |
| Views / `render/3` / filters / Ecto | not lowered |
