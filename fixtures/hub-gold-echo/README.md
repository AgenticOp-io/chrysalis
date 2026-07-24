# hub-gold-echo

Gold fixture for **Echo** as a Go secondary dialect (secondary to Gin
`hub-flagship-go` D6448-ST). Route surface only — no middleware / Group /
binder invent (**D6447**).

## Files

- `main.go` — 20 Echo routes: `e.GET|POST|…`, `:id` paths,
  `c.Param`, `c.QueryParam`, `c.JSON` / `c.String`.

## Smoke

```bash
pnpm run hub:echo-smoke
```

Expect 20/20 hole-free CWL projection.

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `e.Use` / middleware chains | not lowered |
| `e.Group` deep nesting beyond cheap peel | not lowered |
| `c.Bind` / struct binders | not lowered (no invent) |
| Non-literal path templates | not lowered |
