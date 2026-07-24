# hub-gold-servemux

Gold fixture for **Go 1.22+ `net/http` ServeMux** as a Go secondary dialect
(secondary to Gin `hub-flagship-go` D6448-ST). Route surface only — no
middleware invent; pattern conflicts stay honest holes (**D6447**). G10030 / D6492.

## Files

- `main.go` — 20 ServeMux routes: `http.NewServeMux`,
  `mux.HandleFunc("METHOD /path")`, `{id}` paths, `r.PathValue`,
  `r.URL.Query().Get`, `json.NewEncoder`, `w.WriteHeader(http.Status*)`.

## Smoke

```bash
pnpm run hub:servemux-smoke
```

Expect 20/20 hole-free CWL projection.

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| Middleware wrappers (stdlib ServeMux has none) | not lowered |
| Conflicting ServeMux patterns | honest hole |
| Non-literal path templates | not lowered |
