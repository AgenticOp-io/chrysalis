# hub-gold-revel

Gold fixture for **Revel** as a Go secondary dialect (secondary to
Gin `hub-flagship-go` D6448-ST). Route surface only — no router.GET
façades / interceptors invent (**D6447**). G10114 / D6540 (was G10065 skip).

## Files

- `conf/routes` — 20 `METHOD PATH Controller.Action` lines
- `app/controllers/app.go` — `type App struct { *revel.Controller }` +
  `func (c App) Action() revel.Result` peels:
  `c.RenderJSON`, `c.Response.Status = N`, `c.Params.Route.Get` /
  `c.Params.Query.Get`

## Smoke

```bash
pnpm run hub:revel-smoke
```

Expect 20/20 hole-free CWL projection.

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| Interceptors / filters / modules / `revel.OnAppStart` | not lowered |
| Invented `router.GET` / Martini-style façade | refused (**D6447**) |
| Non-literal `conf/routes` paths | not lowered |
| `c.Render` / template HTML beyond cheap JSON | not lowered |
