# hub-gold-buffalo

Gold fixture for **Buffalo** as a Go secondary dialect (secondary to
Gin `hub-flagship-go` D6448-ST). Route surface only — no middleware /
Group / Resource invent (**D6447**). G10055 / D6517.

## Files

- `main.go` — 20 Buffalo routes: `app.GET|POST|…`, `{id}` paths,
  `c.Param("id")`, `c.Render(status, r.JSON(…))` /
  `c.Render(status, r.String(…))`.

## Smoke

```bash
pnpm run hub:buffalo-smoke
```

Expect 20/20 hole-free CWL projection.

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `app.Use` / middleware chains | not lowered |
| `app.Group` nesting beyond cheap peel | not lowered |
| `app.Resource` / controller-style resources | not lowered (not cheap) |
| `c.Bind` / struct binders | not lowered (no invent) |
| `r.HTML` / template render | not lowered |
| Non-literal path templates | not lowered |
