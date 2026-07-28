# hub-gold-beego

Gold fixture for **Beego v2 functional** as a Go secondary dialect (secondary to
Gin `hub-flagship-go` D6448-ST). Route surface only — no Filter /
NSNamespace / Controller invent (**D6447**). G10045 / D6507.

## Files

- `main.go` — 20 Beego routes: `web.Get|Post|…`, `:id` paths,
  `ctx.Input.Param(":id")`, `ctx.Input.Query`, `ctx.JSONResp` /
  `ctx.Output.SetStatus` + `ctx.WriteString`.

## Smoke

```bash
pnpm run hub:beego-smoke
```

Expect 20/20 hole-free CWL projection.

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `web.InsertFilter` / middleware chains | not lowered |
| `web.NewNamespace` / NS* nesting beyond cheap peel | not lowered |
| Controller style (`web.Controller` / `web.Router` + mapping) | not lowered (not cheap) |
| `ctx.Bind` / struct binders | not lowered (no invent) |
| Non-literal path templates | not lowered |
