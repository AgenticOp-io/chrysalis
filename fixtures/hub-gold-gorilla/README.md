# hub-gold-gorilla

Gold fixture for **Gorilla mux** as a Go secondary dialect (secondary to Gin
`hub-flagship-go` D6448-ST). Route surface only — no middleware / Subrouter /
non-literal paths invent (**D6447**). G10018 / D6480.

## Files

- `main.go` — 20 Gorilla mux routes: `HandleFunc`+`Methods`, `{id}` paths,
  `mux.Vars`, `r.URL.Query().Get`, `json.NewEncoder`, `w.WriteHeader(http.Status*)`.

## Smoke

```bash
pnpm run hub:gorilla-smoke
```

Expect 20/20 hole-free CWL projection.
