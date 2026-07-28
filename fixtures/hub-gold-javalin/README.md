# hub-gold-javalin

Gold fixture for **Javalin** (`Javalin.create()` + `app.get|post|…`) fluent routes as a Java
secondary dialect (secondary to Spring `hub-flagship-java` D6448-ST). Route surface only —
no plugin / DI / filter invent (**D6447**).

## Files

- `src/HubApp.java` — 20 routes: `Javalin.create()`, `app.get|post|put|patch|delete("/path", ctx -> …)`,
  `{id}` paths, `ctx.pathParam` / `ctx.queryParam`, `ctx.status(n).json(...)` / `ctx.json(...)` /
  `ctx.result(...)`.

## Smoke

```bash
pnpm run hub:javalin-smoke
```

Expect 20/20 hole-free CWL projection.
