# hub-gold-iris

Gold fixture for **Iris** as a Go secondary dialect (secondary to Gin
`hub-flagship-go` D6448-ST). Route surface only — no middleware / Party /
binder invent (**D6447**). G10038 / D6500.

## Files

- `main.go` — 20 Iris routes: `iris.New()`, `app.Get|Post|…`, `{id}` / `:id`
  paths, `ctx.Params().Get`, `ctx.URLParam` / `ctx.URLParamDefault`,
  `ctx.JSON` / `ctx.StatusCode` + `ctx.WriteString`.

## Smoke

```bash
pnpm run hub:iris-smoke
```

Expect 20/20 hole-free CWL projection.

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `app.Use` / middleware chains | not lowered |
| `app.Party` deep nesting beyond cheap peel | not lowered |
| `ctx.ReadJSON` / struct binders | not lowered (no invent) |
| Non-literal path templates | not lowered |
