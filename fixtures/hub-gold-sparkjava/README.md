# hub-gold-sparkjava

Gold fixture for **Spark Java** (`spark.Spark.get|post|…`) route dialect as a Java secondary
(secondary to Spring `hub-flagship-java` D6448-ST). Route surface only —
no filter / static files / WebSocket invent (**D6447**). Gate **G10036** / **D6498**.

## Files

- `src/HubApp.java` — 20 routes: `spark.Spark.get|post|put|patch|delete`, `:id` paths
  (normalized to `{id}`), `req.params` / `req.queryParams`, `res.status` / `res.type`,
  `Map.of` + scalar returns.

## Smoke

```bash
pnpm run hub:sparkjava-smoke
```

Expect 20/20 hole-free CWL projection.
