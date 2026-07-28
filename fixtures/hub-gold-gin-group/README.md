# hub-gold-gin-group

Gold fixture for **Gin `Group` prefix peel** (G10066 / D6528) on the Gin
Go D6448-ST surface. Literal `r.Group("/prefix")` + nested `g.GET` path join
only — no Group middleware / `Use` invent (**D6447**).

Flat Gin ST remains `hub-flagship-go` (`hub:go-flagship`).

## Files

- `main.go` — 20 Gin routes under `/meta` and `/api` (+ nested `/api/items`)
  Groups; named handlers with `c.Param` / `c.DefaultQuery` / `c.JSON` /
  `c.String`.

## Smoke

```bash
pnpm run hub:gin-group-smoke
```

Expect 20/20 hole-free with joined paths (e.g. `GET /api/items/:id`).

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| Non-literal `Group(prefixVar)` | not lowered |
| `Group("/p", middleware…)` | not lowered (no invent) |
| `g.Use` / middleware on Group | not lowered (no invent) |
| Echo/Fiber/Buffalo/Martini Group | still honest holes (dialect catalogs) |
