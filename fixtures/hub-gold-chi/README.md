# hub-gold-chi

Gold fixture for **Chi** as a Go secondary dialect (secondary to Gin
`hub-flagship-go` D6448-ST). Route surface only — no middleware / Mount /
non-literal paths invent (**D6447**).

## Files

- `main.go` — 20 Chi routes: `r.Get|Post|…`, `{id}` paths,
  `chi.URLParam`, `r.URL.Query().Get`, `w.WriteHeader(http.Status*)`.

## Smoke

```bash
pnpm run hub:chi-smoke
```

Expect 20/20 hole-free CWL projection.
