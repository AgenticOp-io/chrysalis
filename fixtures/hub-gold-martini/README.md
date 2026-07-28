# hub-gold-martini

Gold fixture for **Martini** as a Go secondary dialect (secondary to
Gin `hub-flagship-go` D6448-ST). Route surface only — no middleware /
Group / bind invent (**D6447**). G10056 / D6518.

## Files

- `main.go` — 20 Martini routes: `martini.Classic()`, `m.Get|Post|…`,
  `:id` paths, `params["id"]` (`martini.Params`), `render.JSON` /
  `json.NewEncoder(w)` / `io.WriteString` / string returns.

## Smoke

```bash
pnpm run hub:martini-smoke
```

Expect 20/20 hole-free CWL projection.

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `m.Use` / middleware chains beyond Renderer peel | not lowered |
| `m.Group` nesting beyond cheap peel | not lowered |
| `m.Map` / custom DI injectors | not lowered (no invent) |
| Struct binders / `binding` package | not lowered |
| Non-literal path templates | not lowered |
