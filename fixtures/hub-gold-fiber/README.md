# hub-gold-fiber

Gold fixture for **Fiber** as a Go secondary dialect (secondary to Gin
`hub-flagship-go` D6448-ST). Route surface only — no middleware / Group /
binder invent (**D6447**). G10017 / D6479.

## Files

- `main.go` — 20 Fiber routes: `app.Get|Post|…`, `:id` paths,
  `c.Params`, `c.Query`, `c.JSON` / `c.Status(n).JSON` / `c.SendString`.

## Smoke

```bash
pnpm run hub:fiber-smoke
```

Expect 20/20 hole-free CWL projection.

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `app.Use` / middleware chains | not lowered |
| `app.Group` deep nesting beyond cheap peel | not lowered |
| `c.BodyParser` / struct binders | not lowered (no invent) |
| Non-literal path templates | not lowered |
